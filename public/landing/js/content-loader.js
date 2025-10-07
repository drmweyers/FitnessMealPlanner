// Content Loader - Loads and parses markdown content files

class ContentLoader {
    constructor() {
        this.contentPath = '/landing/content/';
        this.contentFiles = [
            'hero.md',
            'stats.md',
            'problem.md',
            'solution.md',
            'features.md',
            'testimonials.md',
            'pricing.md',
            'faq.md',
            'cta.md',
            'footer.md'
        ];
    }

    // Parse markdown into structured data
    parseMarkdown(markdown) {
        const lines = markdown.split('\n');
        const data = {};
        let currentSection = null;
        let currentSubsection = null;
        let currentItem = null;

        lines.forEach(line => {
            line = line.trim();

            if (line.startsWith('# ')) {
                // Main section
                currentSection = line.substring(2).toLowerCase().replace(/\s+/g, '_');
                data[currentSection] = {};
            } else if (line.startsWith('## ')) {
                // Subsection
                currentSubsection = line.substring(3);
                if (currentSection) {
                    if (!data[currentSection][currentSubsection]) {
                        data[currentSection][currentSubsection] = {};
                    }
                    currentItem = data[currentSection][currentSubsection];
                }
            } else if (line.startsWith('### ')) {
                // Property
                const property = line.substring(4);
                if (currentItem) {
                    currentItem[property] = '';
                }
            } else if (line.startsWith('- ')) {
                // List item
                const listItem = line.substring(2);
                const lastKey = Object.keys(currentItem).pop();
                if (lastKey) {
                    if (!Array.isArray(currentItem[lastKey])) {
                        const existing = currentItem[lastKey];
                        currentItem[lastKey] = existing ? [existing] : [];
                    }
                    currentItem[lastKey].push(listItem);
                }
            } else if (line && currentItem) {
                // Content line
                const lastKey = Object.keys(currentItem).pop();
                if (lastKey && !currentItem[lastKey]) {
                    currentItem[lastKey] = line;
                } else if (lastKey && currentItem[lastKey]) {
                    currentItem[lastKey] += '\n' + line;
                }
            }
        });

        return data;
    }

    // Load content from markdown file
    async loadContent(filename) {
        try {
            const response = await fetch(this.contentPath + filename);
            if (!response.ok) throw new Error(`Failed to load ${filename}`);
            const markdown = await response.text();
            return this.parseMarkdown(markdown);
        } catch (error) {
            console.error(`Error loading content from ${filename}:`, error);
            return null;
        }
    }

    // Update hero section
    updateHeroSection(content) {
        const hero = content.hero_section;
        if (!hero) return;

        // Update badge
        const badge = document.querySelector('.hero-badge');
        if (badge && hero.Badge) {
            badge.textContent = hero.Badge.Badge;
        }

        // Update headline
        const headline = document.querySelector('.hero-headline');
        if (headline && hero.Headline) {
            const parts = hero.Headline.Headline.split('\n');
            headline.innerHTML = parts.map((part, i) =>
                i === 0 ? part : `<span class="gradient-text">${part}</span>`
            ).join('<br>');
        }

        // Update subheadline
        const subheadline = document.querySelector('.hero-subheadline');
        if (subheadline && hero.Subheadline) {
            subheadline.textContent = hero.Subheadline.Subheadline;
        }

        // Update buttons
        const primaryBtn = document.querySelector('.hero-primary-btn');
        if (primaryBtn && hero['Primary Button']) {
            primaryBtn.textContent = hero['Primary Button']['Primary Button'];
        }

        const secondaryBtn = document.querySelector('.hero-secondary-btn');
        if (secondaryBtn && hero['Secondary Button']) {
            secondaryBtn.innerHTML = `<i class="fas fa-play-circle mr-2"></i> ${hero['Secondary Button']['Secondary Button']}`;
        }

        // Update bottom text
        const bottomText = document.querySelector('.hero-bottom-text');
        if (bottomText && hero['Bottom Text']) {
            bottomText.textContent = hero['Bottom Text']['Bottom Text'];
        }
    }

    // Update stats section
    updateStatsSection(content) {
        const stats = content.stats_section;
        if (!stats) return;

        for (let i = 1; i <= 4; i++) {
            const stat = stats[`Stat ${i}`];
            if (stat) {
                const numberEl = document.querySelector(`.stat-${i}-number`);
                const labelEl = document.querySelector(`.stat-${i}-label`);

                if (numberEl && stat.Number) numberEl.textContent = stat.Number;
                if (labelEl && stat.Label) labelEl.textContent = stat.Label;
            }
        }
    }

    // Update problem section
    updateProblemSection(content) {
        const problem = content.problem_section;
        if (!problem) return;

        const headline = document.querySelector('.problem-headline');
        if (headline && problem.Headline) {
            headline.textContent = problem.Headline.Headline;
        }

        const subheadline = document.querySelector('.problem-subheadline');
        if (subheadline && problem.Subheadline) {
            subheadline.textContent = problem.Subheadline.Subheadline;
        }

        for (let i = 1; i <= 3; i++) {
            const prob = problem[`Problem ${i}`];
            if (prob) {
                const iconEl = document.querySelector(`.problem-${i}-icon`);
                const titleEl = document.querySelector(`.problem-${i}-title`);
                const descEl = document.querySelector(`.problem-${i}-desc`);

                if (iconEl && prob.Icon) iconEl.textContent = prob.Icon;
                if (titleEl && prob.Title) titleEl.textContent = prob.Title;
                if (descEl && prob.Description) descEl.textContent = prob.Description;
            }
        }
    }

    // Update testimonials section
    updateTestimonialsSection(content) {
        const testimonials = content.testimonials_section;
        if (!testimonials) return;

        const headline = document.querySelector('.testimonials-headline');
        if (headline && testimonials.Headline) {
            headline.textContent = testimonials.Headline.Headline;
        }

        for (let i = 1; i <= 3; i++) {
            const testimonial = testimonials[`Testimonial ${i}`];
            if (testimonial) {
                const quoteEl = document.querySelector(`.testimonial-${i}-quote`);
                const nameEl = document.querySelector(`.testimonial-${i}-name`);
                const titleEl = document.querySelector(`.testimonial-${i}-title`);

                if (quoteEl && testimonial.Quote) {
                    quoteEl.textContent = `"${testimonial.Quote}"`;
                }
                if (nameEl && testimonial.Name) {
                    nameEl.textContent = testimonial.Name;
                }
                if (titleEl && testimonial.Title) {
                    titleEl.textContent = testimonial.Title;
                }
            }
        }
    }

    // Update pricing section
    updatePricingSection(content) {
        const pricing = content.pricing_section;
        if (!pricing) return;

        const headline = document.querySelector('.pricing-headline');
        if (headline && pricing.Headline) {
            headline.textContent = pricing.Headline.Headline;
        }

        for (let i = 1; i <= 3; i++) {
            const planKey = i === 1 ? 'Plan 1 - Starter' : i === 2 ? 'Plan 2 - Professional' : 'Plan 3 - Enterprise';
            const plan = pricing[planKey];
            if (plan) {
                const priceEl = document.querySelector(`.plan-${i}-price`);
                const descEl = document.querySelector(`.plan-${i}-desc`);
                const featuresEl = document.querySelector(`.plan-${i}-features`);
                const buttonEl = document.querySelector(`.plan-${i}-button`);

                if (priceEl && plan.Price) {
                    priceEl.innerHTML = `${plan.Price}<span class="text-lg text-gray-600">${plan.Period}</span>`;
                }
                if (descEl && plan.Description) {
                    descEl.textContent = plan.Description;
                }
                if (featuresEl && plan.Features) {
                    const features = Array.isArray(plan.Features) ? plan.Features : [plan.Features];
                    featuresEl.innerHTML = features.map(f =>
                        `<li><i class="fas fa-check text-green-500 mr-2"></i>${f}</li>`
                    ).join('');
                }
                if (buttonEl && plan['Button Text']) {
                    buttonEl.textContent = plan['Button Text'];
                }
            }
        }
    }

    // Update FAQ section
    updateFAQSection(content) {
        const faq = content.faq_section;
        if (!faq) return;

        const container = document.querySelector('.faq-container');
        if (!container) return;

        let faqHtml = '';
        let i = 1;
        while (faq[`FAQ ${i}`]) {
            const item = faq[`FAQ ${i}`];
            if (item.Question && item.Answer) {
                faqHtml += `
                    <div class="bg-gray-50 p-6 rounded-lg">
                        <h3 class="text-xl font-semibold mb-2">${item.Question}</h3>
                        <p class="text-gray-600">${item.Answer}</p>
                    </div>
                `;
            }
            i++;
        }

        if (faqHtml) {
            container.innerHTML = faqHtml;
        }
    }

    // Initialize and load all content
    async init() {
        console.log('Loading markdown content...');

        // Load all content files
        for (const file of this.contentFiles) {
            const content = await this.loadContent(file);
            if (content) {
                // Update respective sections based on content
                switch(file) {
                    case 'hero.md':
                        this.updateHeroSection(content);
                        break;
                    case 'stats.md':
                        this.updateStatsSection(content);
                        break;
                    case 'problem.md':
                        this.updateProblemSection(content);
                        break;
                    case 'testimonials.md':
                        this.updateTestimonialsSection(content);
                        break;
                    case 'pricing.md':
                        this.updatePricingSection(content);
                        break;
                    case 'faq.md':
                        this.updateFAQSection(content);
                        break;
                }
            }
        }

        console.log('Content loading complete!');
    }
}

// Initialize content loader when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const loader = new ContentLoader();
    loader.init().catch(console.error);
});