// School branding shown across the admin, teacher and student portals.
export const SCHOOL_NAME = 'Advent Hope Academy';
export const SCHOOL_GROUP = 'Advent Hope Group of Schools';
export const SCHOOL_WEBSITE = 'https://adventhope.ac.zw';
export const SCHOOL_WEBSITE_LABEL = 'adventhope.ac.zw';
export const SCHOOL_LOGO = '/advent-hope-logo.png';
export const SCHOOL_MOTTO = ['Focus', 'Hope', 'Integrity', 'Success'];

export const pageTitle = (page: string) => `${SCHOOL_NAME} — ${page}`;

// Sets the browser tab title and the description search engines show for the page.
export const setPageMeta = (page: string, description?: string) => {
  document.title = pageTitle(page);
  if (!description) return;
  let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = 'description';
    document.head.appendChild(tag);
  }
  tag.content = description;
};
