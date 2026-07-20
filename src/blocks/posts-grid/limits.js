export const MAX_PUBLIC_PAGE = 100;
export const MAX_POSTS_PER_PAGE = 50;
export const MAX_TERMS = 50;
export const MAX_SELECTED_POSTS = 100;
export const MAX_KEYWORD_LENGTH = 100;
export const MAX_POST_TOKEN_TITLE_LENGTH = 200;
export const MAX_ELEMENTS = 5;
export const MAX_META_FIELDS = 20;
export const MAX_READ_MORE_LABEL_LENGTH = 100;
export const MAX_EMPTY_STATE_TEXT_LENGTH = 300;
export const MAX_PRESENTATION_STRING_LENGTH = 100;
export const MAX_OBJECT_SLUG_LENGTH = 64;

export const getPublicPageNumber = ( value ) => {
	const page = Number( value );

	return Number.isFinite( page ) &&
		Number.isInteger( page ) &&
		page >= 1 &&
		page <= MAX_PUBLIC_PAGE
		? page
		: null;
};
