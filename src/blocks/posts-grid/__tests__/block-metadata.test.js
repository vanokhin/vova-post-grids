import metadata from '../block.json';

describe( 'Posts Grid localized defaults', () => {
	it.each( [ 'readMoreLabel', 'emptyStateText' ] )(
		'leaves %s empty for the translated runtime fallback',
		( attribute ) => {
			expect( metadata.attributes[ attribute ].default ).toBe( '' );
		}
	);
} );
