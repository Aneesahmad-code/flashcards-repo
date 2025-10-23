// index.js (entry point)
import { attachAuthListeners, showAuthForm, showAppView } from './js/auth.js';
import { fetchAndRenderSubjects } from './js/subjects.js';

const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  attachAuthListeners({
    onLoginSuccess: () => {
      showAppView();
      const subjectsHost = $('subjectManagement');
      fetchAndRenderSubjects(subjectsHost);
    },
  });

  showAuthForm('login');
});
