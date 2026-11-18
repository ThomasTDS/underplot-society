// Stand-in for next/font/local in unit tests: the real one only runs inside Next's
// compiler. Returns the same shape with empty class names.
export default function localFont(options: { variable?: string }) {
  return { className: "", variable: "", style: { fontFamily: options.variable ?? "" } };
}
