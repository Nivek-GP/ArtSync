import { Resvg } from '@resvg/resvg-js'
import pngToIco from 'png-to-ico'
import { writeFileSync } from 'fs'

const SVG = `
<svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="44" height="44" rx="10" fill="url(#g)"/>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#555555"/>
      <stop offset="100%" stop-color="#252525"/>
    </linearGradient>
  </defs>
  <!-- screen lid: ∩ shape — top bar + left/right columns -->
  <path d="M 7,22 L 7,3 Q 7,2 9,2 L 35,2 Q 37,2 37,3 L 37,22"
    fill="none" stroke="white" stroke-width="2.4" stroke-opacity="0.9"
    stroke-linecap="round" stroke-linejoin="round"/>
  <!-- body: closed trapezoid — top edge is the hinge line -->
  <path d="M 7,22 L 3,40 Q 3,41 5,41 L 39,41 Q 41,41 41,40 L 37,22 Z"
    fill="none" stroke="white" stroke-width="2.4" stroke-opacity="0.9"
    stroke-linejoin="round"/>
  <!-- d-pad -->
  <rect x="8" y="30.5" width="6.5" height="2.5" rx="1" fill="white" fill-opacity="0.85"/>
  <rect x="10.25" y="28.5" width="2.5" height="6.5" rx="1" fill="white" fill-opacity="0.85"/>
  <!-- face buttons -->
  <circle cx="32" cy="30" r="2" fill="white" fill-opacity="0.85"/>
  <circle cx="36.5" cy="30" r="2" fill="white" fill-opacity="0.85"/>
  <circle cx="32" cy="34.5" r="2" fill="white" fill-opacity="0.85"/>
  <circle cx="36.5" cy="34.5" r="2" fill="white" fill-opacity="0.85"/>
  <!-- download arrow -->
  <line x1="22" y1="1" x2="22" y2="15"
    stroke="white" stroke-width="5" stroke-linecap="round" stroke-opacity="0.95"/>
  <polygon points="12,14 32,14 22,27" fill="white" fill-opacity="0.95"/>
</svg>
`

const sizes = [16, 32, 48, 64, 128, 256, 512, 1024]

const pngs = sizes.map((size) => {
  const resvg = new Resvg(SVG, { fitTo: { mode: 'width', value: size } })
  return resvg.render().asPng()
})

writeFileSync('resources/icon.png', pngs[pngs.length - 1])
console.log('icon.png written (1024px)')

const icoBuffer = await pngToIco(pngs.slice(0, 6))
writeFileSync('build/icon.ico', icoBuffer)
console.log('icon.ico written')

const icns256 = pngs[5]
writeFileSync('build/icon.icns', icns256)
console.log('build/icon.icns written (placeholder — use iconutil on Mac for production)')
