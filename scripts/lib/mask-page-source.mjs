const MASK = '[masked]';
const INPUT = /(^|\.)(EditText|AutoCompleteTextView)$|^XCUIElementType(TextField|SecureTextField|TextView|SearchField)$/;
const LIST = /(^|\.)(RecyclerView|ListView|GridView)$|^XCUIElementType(Table|CollectionView|Cell)$/;
const INPUT_ATTRS = /(\s)(text|value)="[^"]*"/g;
const LIST_ATTRS = /(\s)(text|content-desc|label|name|value)="[^"]*"/g;
const TAG = /<(\/?)([A-Za-z_][\w.:-]*)([^>]*?)(\/?)>/g;

export function maskPageSource(xml) {
  const insideList = [];
  return xml.replace(TAG, (tag, closing, name, attrs, selfClosing) => {
    if (closing) {
      insideList.pop();
      return tag;
    }
    const inList = insideList.at(-1) ?? false;
    const pattern = inList ? LIST_ATTRS : INPUT.test(name) ? INPUT_ATTRS : undefined;
    if (!selfClosing) insideList.push(inList || LIST.test(name));
    return pattern === undefined ? tag : `<${name}${attrs.replace(pattern, `$1$2="${MASK}"`)}${selfClosing}>`;
  });
}

export const collectShareable = (files) => files.filter((file) => /\.xml$/i.test(file));
