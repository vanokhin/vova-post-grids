const menuToggle = document.querySelector( '[data-menu-toggle]' );
const menu = document.querySelector( '[data-menu]' );

const closeMenu = () => {
	if ( ! menuToggle || ! menu ) {
		return;
	}

	menuToggle.setAttribute( 'aria-expanded', 'false' );
	menu.removeAttribute( 'data-open' );
};

menuToggle?.addEventListener( 'click', () => {
	const isOpen = menuToggle.getAttribute( 'aria-expanded' ) === 'true';
	menuToggle.setAttribute( 'aria-expanded', String( ! isOpen ) );
	menu?.toggleAttribute( 'data-open', ! isOpen );
} );

menu?.querySelectorAll( 'a' ).forEach( ( link ) => {
	link.addEventListener( 'click', closeMenu );
} );

document.addEventListener( 'keydown', ( event ) => {
	if ( event.key === 'Escape' ) {
		closeMenu();
	}
} );

const demoTabs = [ ...document.querySelectorAll( '[data-demo-tab]' ) ];
const demoPanels = [ ...document.querySelectorAll( '[data-demo-panel]' ) ];

const activateDemoTab = ( tab, moveFocus = false ) => {
	const activePanel = tab.dataset.demoTab;

	demoTabs.forEach( ( item ) => {
		const isActive = item === tab;
		item.setAttribute( 'aria-selected', String( isActive ) );
		item.tabIndex = isActive ? 0 : -1;
	} );

	demoPanels.forEach( ( panel ) => {
		panel.hidden = panel.dataset.demoPanel !== activePanel;
	} );

	if ( moveFocus ) {
		tab.focus();
	}
};

demoTabs.forEach( ( tab, index ) => {
	tab.addEventListener( 'click', () => activateDemoTab( tab ) );
	tab.addEventListener( 'keydown', ( event ) => {
		const lastIndex = demoTabs.length - 1;
		const nextIndex = {
			ArrowLeft: index === 0 ? lastIndex : index - 1,
			ArrowRight: index === lastIndex ? 0 : index + 1,
			Home: 0,
			End: lastIndex,
		}[ event.key ];

		if ( nextIndex === undefined ) {
			return;
		}

		event.preventDefault();
		activateDemoTab( demoTabs[ nextIndex ], true );
	} );
} );

const demoGrid = document.querySelector( '[data-demo-grid]' );
const columnButtons = [
	...document.querySelectorAll( '.column-switcher [data-columns]' ),
];

columnButtons.forEach( ( button ) => {
	button.addEventListener( 'click', () => {
		demoGrid?.setAttribute( 'data-columns', button.dataset.columns );
		columnButtons.forEach( ( item ) => {
			item.classList.toggle( 'is-active', item === button );
		} );
	} );
} );

document.querySelectorAll( '[data-year]' ).forEach( ( element ) => {
	element.textContent = new Date().getFullYear();
} );

const prefersReducedMotion = window.matchMedia(
	'(prefers-reduced-motion: reduce)'
).matches;

if ( prefersReducedMotion || ! ( 'IntersectionObserver' in window ) ) {
	document.querySelectorAll( '[data-reveal]' ).forEach( ( element ) => {
		element.setAttribute( 'data-visible', '' );
	} );
} else {
	const revealObserver = new window.IntersectionObserver(
		( entries, observer ) => {
			entries.forEach( ( entry ) => {
				if ( entry.isIntersecting ) {
					entry.target.setAttribute( 'data-visible', '' );
					observer.unobserve( entry.target );
				}
			} );
		},
		{ rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
	);

	document.querySelectorAll( '[data-reveal]' ).forEach( ( element ) => {
		revealObserver.observe( element );
	} );
}
