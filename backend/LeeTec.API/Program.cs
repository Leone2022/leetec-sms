using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using LeeTec.API.Data;
using LeeTec.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Allowed CORS origins (non-wildcard)
string[] allowedOrigins = [
    "https://adventhopeacademy.com",
    "https://www.adventhopeacademy.com",
    "http://localhost:5173",
];

// ── Database: build connection string from Railway env vars ──────────────────
var dbHost = Environment.GetEnvironmentVariable("MYSQLHOST") ?? "localhost";
var dbPort = Environment.GetEnvironmentVariable("MYSQLPORT") ?? "3306";
var dbName = Environment.GetEnvironmentVariable("MYSQLDATABASE") ?? "leetec_sms";
var dbUser = Environment.GetEnvironmentVariable("MYSQLUSER") ?? "root";
var dbPass = Environment.GetEnvironmentVariable("MYSQLPASSWORD") ?? "";
var connStr = $"Server={dbHost};Port={dbPort};Database={dbName};User={dbUser};Password={dbPass};";

// ── Email: overlay env vars onto appsettings values ──────────────────────────
var emailOverrides = new Dictionary<string, string?>();
var eHost = Environment.GetEnvironmentVariable("EMAIL_SMTP_HOST");
var ePort = Environment.GetEnvironmentVariable("EMAIL_PORT");
var eSender = Environment.GetEnvironmentVariable("EMAIL_SENDER");
var ePass = Environment.GetEnvironmentVariable("EMAIL_PASSWORD");
var eName = Environment.GetEnvironmentVariable("EMAIL_NAME");
if (!string.IsNullOrEmpty(eHost))   emailOverrides["Email:SmtpHost"]    = eHost;
if (!string.IsNullOrEmpty(ePort))   emailOverrides["Email:SmtpPort"]    = ePort;
if (!string.IsNullOrEmpty(eSender)) emailOverrides["Email:SenderEmail"] = eSender;
if (!string.IsNullOrEmpty(ePass))   emailOverrides["Email:AppPassword"] = ePass;
if (!string.IsNullOrEmpty(eName))   emailOverrides["Email:SenderName"]  = eName;
if (emailOverrides.Count > 0)
    builder.Configuration.AddInMemoryCollection(emailOverrides);

// ── JWT: env vars take precedence over appsettings ───────────────────────────
var jwtKey    = Environment.GetEnvironmentVariable("JWT_KEY")      ?? builder.Configuration["Jwt:Key"]!;
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER")   ?? builder.Configuration["Jwt:Issuer"]!;
var jwtAud    = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? builder.Configuration["Jwt:Audience"]!;

// Email Service
builder.Services.AddScoped<IEmailService, EmailService>();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.WriteIndented = true;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connStr, new MariaDbServerVersion(new Version(10, 4, 0))));

// JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAud,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrEmpty(origin)) return false;
            if (allowedOrigins.Contains(origin)) return true;
            // Allow any Vercel preview/production deployment
            if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                return uri.Scheme == "https" && uri.Host.EndsWith(".vercel.app");
            return false;
        })
        .AllowAnyHeader()
        .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Health check for Railway
app.MapGet("/health", () => Results.Ok("LeeTec SMS API is running"));

// Seed default data
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    context.Database.Migrate();
    DataSeeder.SeedData(context);
}

app.Run();
