/** Where the sidebar remembers being collapsed (this browser only). */
export const SIDEBAR_STORAGE_KEY = 'reap-sidebar'

/**
 * Runs before the sidebar paints (inlined by AppShell): puts the remembered
 * collapsed state on <html>, so the page never jumps from open to collapsed.
 */
export const SIDEBAR_BOOT_SCRIPT = `try{if(localStorage.getItem('${SIDEBAR_STORAGE_KEY}')==='collapsed')document.documentElement.dataset.sidebar='collapsed'}catch(e){}`
