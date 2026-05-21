// Clipboard copy for code blocks
document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const code = btn.closest('.code-block').querySelector('code').textContent;
        navigator.clipboard.writeText(code).then(() => {
            const icon = btn.querySelector('i');
            icon.className = 'bi bi-check2';
            setTimeout(() => { icon.className = 'bi bi-clipboard'; }, 1600);
        });
    });
});

// Active nav link on scroll
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.ck-navbar .nav-link[href^="#"]');

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            navLinks.forEach(l => l.classList.remove('active-nav'));
            const active = document.querySelector(`.ck-navbar .nav-link[href="#${entry.target.id}"]`);
            if (active) active.classList.add('active-nav');
        }
    });
}, { rootMargin: '-50% 0px -50% 0px' });

sections.forEach(s => observer.observe(s));
