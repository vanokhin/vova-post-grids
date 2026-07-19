const menuToggle = document.querySelector( '[data-menu-toggle]' );
const menu = document.querySelector( '[data-menu]' );

const closeMenu = ( returnFocus = false ) => {
	if ( ! menuToggle || ! menu ) {
		return;
	}

	menuToggle.setAttribute( 'aria-expanded', 'false' );
	menu.removeAttribute( 'data-open' );

	if ( returnFocus ) {
		menuToggle.focus();
	}
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
		closeMenu( true );
	}
} );

document.querySelectorAll( '[data-year]' ).forEach( ( element ) => {
	element.textContent = new Date().getFullYear();
} );
