// A product's name, with the eBac wordmark shown in place of the word "eBac".
//
// The water is a resold, eBac-branded product, so its name carries the brand's
// own logo rather than the word set in our type. Everything else renders as
// plain text, exactly as before.
//
// Screen readers and search engines still get the word: the image carries
// alt="eBac", so the accessible name of the heading stays "eBac Brand Water
// 30 mL". Anywhere a real string is required — page <title>, structured data,
// emails, the alt text on the vial photo — keep using the plain name.

const BRAND_PREFIX = 'eBac'

export default function ProductName({
  name,
  /** Height of the wordmark, relative to the surrounding text. */
  markClassName = 'h-[1.05em]',
}: {
  name: string
  markClassName?: string
}) {
  if (!name?.startsWith(BRAND_PREFIX)) return <>{name}</>

  const rest = name.slice(BRAND_PREFIX.length)

  return (
    <>
      <img
        src="/ebac-logo.png"
        alt="eBac"
        className={`inline-block w-auto align-[-0.16em] ${markClassName}`}
      />
      {rest}
    </>
  )
}
