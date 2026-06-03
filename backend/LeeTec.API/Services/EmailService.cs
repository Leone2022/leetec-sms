using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace LeeTec.API.Services
{
    public interface IEmailService
    {
        Task SendEmailVerificationAsync(string toEmail, string studentName, string verificationLink);
        Task SendPasswordResetAsync(string toEmail, string studentName, string resetLink);
        Task SendAccountApprovedAsync(string toEmail, string studentName);
        Task SendWelcomeEmailAsync(string toEmail, string studentName);
        Task SendAsync(string toEmail, string subject, string htmlBody);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        private async Task SendEmailAsync(string toEmail, string toName, string subject, string htmlBody)
        {
            var email = new MimeMessage();
            email.From.Add(new MailboxAddress(
                _config["Email:SenderName"],
                _config["Email:SenderEmail"]
            ));
            email.To.Add(new MailboxAddress(toName, toEmail));
            email.Subject = subject;

            var builder = new BodyBuilder { HtmlBody = htmlBody };
            email.Body = builder.ToMessageBody();

            using var smtp = new SmtpClient();
            await smtp.ConnectAsync(
                _config["Email:SmtpHost"],
                int.Parse(_config["Email:SmtpPort"]!),
                SecureSocketOptions.StartTls
            );
            await smtp.AuthenticateAsync(
                _config["Email:SenderEmail"],
                _config["Email:AppPassword"]
            );
            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);
        }

        public async Task SendEmailVerificationAsync(string toEmail, string studentName, string verificationLink)
        {
            var subject = "Verify Your Email - LeeTec School System";
            var body = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                    <div style='background-color: #1a5276; padding: 20px; text-align: center;'>
                        <h1 style='color: white; margin: 0;'>LeeTec School System</h1>
                    </div>
                    <div style='padding: 30px; background-color: #f9f9f9;'>
                        <h2>Hello {studentName}!</h2>
                        <p>Thank you for registering on the LeeTec Student Portal.</p>
                        <p>Please verify your email address by clicking the button below:</p>
                        <div style='text-align: center; margin: 30px 0;'>
                            <a href='{verificationLink}' 
                               style='background-color: #1a5276; color: white; padding: 15px 30px; 
                                      text-decoration: none; border-radius: 5px; font-size: 16px;'>
                                Verify My Email
                            </a>
                        </div>
                        <p>This link expires in <strong>24 hours</strong>.</p>
                        <p>If you did not register, please ignore this email.</p>
                    </div>
                    <div style='background-color: #1a5276; padding: 15px; text-align: center;'>
                        <p style='color: white; margin: 0;'>LeeTec School Management System</p>
                    </div>
                </div>";

            await SendEmailAsync(toEmail, studentName, subject, body);
        }

        public async Task SendPasswordResetAsync(string toEmail, string studentName, string resetLink)
        {
            var subject = "Password Reset - LeeTec School System";
            var body = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                    <div style='background-color: #1a5276; padding: 20px; text-align: center;'>
                        <h1 style='color: white; margin: 0;'>LeeTec School System</h1>
                    </div>
                    <div style='padding: 30px; background-color: #f9f9f9;'>
                        <h2>Hello {studentName}!</h2>
                        <p>We received a request to reset your password.</p>
                        <p>Click the button below to reset your password:</p>
                        <div style='text-align: center; margin: 30px 0;'>
                            <a href='{resetLink}' 
                               style='background-color: #e74c3c; color: white; padding: 15px 30px; 
                                      text-decoration: none; border-radius: 5px; font-size: 16px;'>
                                Reset My Password
                            </a>
                        </div>
                        <p>This link expires in <strong>1 hour</strong>.</p>
                        <p>If you did not request a password reset, please ignore this email.</p>
                    </div>
                    <div style='background-color: #1a5276; padding: 15px; text-align: center;'>
                        <p style='color: white; margin: 0;'>LeeTec School Management System</p>
                    </div>
                </div>";

            await SendEmailAsync(toEmail, studentName, subject, body);
        }

        public async Task SendAccountApprovedAsync(string toEmail, string studentName)
        {
            var subject = "Account Approved - LeeTec School System";
            var body = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                    <div style='background-color: #1a5276; padding: 20px; text-align: center;'>
                        <h1 style='color: white; margin: 0;'>LeeTec School System</h1>
                    </div>
                    <div style='padding: 30px; background-color: #f9f9f9;'>
                        <h2>Hello {studentName}!</h2>
                        <p>Great news! Your student portal account has been <strong>approved</strong>.</p>
                        <p>You can now log in to view your:</p>
                        <ul>
                            <li>Fee statements and balances</li>
                            <li>Academic results</li>
                            <li>School notices</li>
                        </ul>
                        <div style='text-align: center; margin: 30px 0;'>
                            <a href='http://localhost:5173/login' 
                               style='background-color: #27ae60; color: white; padding: 15px 30px; 
                                      text-decoration: none; border-radius: 5px; font-size: 16px;'>
                                Login to Portal
                            </a>
                        </div>
                    </div>
                    <div style='background-color: #1a5276; padding: 15px; text-align: center;'>
                        <p style='color: white; margin: 0;'>LeeTec School Management System</p>
                    </div>
                </div>";

            await SendEmailAsync(toEmail, studentName, subject, body);
        }

        public async Task SendAsync(string toEmail, string subject, string htmlBody)
        {
            await SendEmailAsync(toEmail, toEmail, subject, htmlBody);
        }

        public async Task SendWelcomeEmailAsync(string toEmail, string studentName)
        {
            var subject = "Welcome to LeeTec Student Portal!";
            var body = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                    <div style='background-color: #1a5276; padding: 20px; text-align: center;'>
                        <h1 style='color: white; margin: 0;'>LeeTec School System</h1>
                    </div>
                    <div style='padding: 30px; background-color: #f9f9f9;'>
                        <h2>Welcome {studentName}! 🎉</h2>
                        <p>Your account is fully set up and ready to use.</p>
                        <p>Education for Service and Eternity!</p>
                    </div>
                    <div style='background-color: #1a5276; padding: 15px; text-align: center;'>
                        <p style='color: white; margin: 0;'>LeeTec School Management System</p>
                    </div>
                </div>";

            await SendEmailAsync(toEmail, studentName, subject, body);
        }
    }
}