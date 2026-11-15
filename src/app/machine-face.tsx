export default function MachineFace({ active }: { active: boolean }) {
  return <svg viewBox="0 0 440 470" className={`machine-face ${active ? "awake" : ""}`} role="img" aria-label="Angular robot face with glowing red eyes">
    <defs>
      <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#543336"/><stop offset=".32" stopColor="#241b20"/><stop offset=".7" stopColor="#110f13"/><stop offset="1" stopColor="#352329"/></linearGradient>
      <linearGradient id="ridge" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#20191d"/><stop offset=".5" stopColor="#926069"/><stop offset=".52" stopColor="#3b242b"/><stop offset="1" stopColor="#151115"/></linearGradient>
      <linearGradient id="cheek" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#4b2b32"/><stop offset=".45" stopColor="#24151c"/><stop offset="1" stopColor="#09090c"/></linearGradient>
      <linearGradient id="eye" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#fff4e8"/><stop offset=".35" stopColor="#ff8b81"/><stop offset="1" stopColor="#ff242c"/></linearGradient>
      <filter id="redGlow" x="-100%" y="-200%" width="300%" height="500%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="softGlow"><feGaussianBlur stdDeviation="13"/></filter>
    </defs>
    <path d="M124 81 177 46 263 46 316 81 346 160 337 264 307 351 264 404 220 421 176 404 133 351 103 264 94 160Z" fill="#07080a" stroke="#6c2c35" strokeWidth="1.5"/>
    <path d="m112 153 19-66 49-31 80 0 49 31 19 66-28 44-80-21-80 21Z" fill="url(#metal)" stroke="#66434a"/>
    <path d="m180 56 18 107 22 25 22-25 18-107-40 15Z" fill="url(#ridge)" stroke="#82505a" strokeWidth=".7"/>
    <path d="m132 92 42-27 9 60-44 28-23-4Z" fill="#39232a" stroke="#51323a"/>
    <path d="m308 92-42-27-9 60 44 28 23-4Z" fill="#291b22" stroke="#51323a"/>
    <path d="m116 153 66-27 16 39-13 31-62-18Z" fill="#100e13"/><path d="m324 153-66-27-16 39 13 31 62-18Z" fill="#100e13"/>
    <path d="m120 180 22 43 51 10 14-24-55-31Z" fill="#ff2532" opacity=".5" filter="url(#softGlow)"/><path d="m320 180-22 43-51 10-14-24 55-31Z" fill="#ff2532" opacity=".5" filter="url(#softGlow)"/>
    <path d="m119 174 39 9 49 24-13 22-59-18Z" fill="#030305" stroke="#8b333c"/><path d="m321 174-39 9-49 24 13 22 59-18Z" fill="#030305" stroke="#8b333c"/>
    <g filter="url(#redGlow)" className="eyes"><path d="m129 185 29 7 39 19-10 7-45-12Z" fill="url(#eye)"/><path d="m311 185-29 7-39 19 10 7 45-12Z" fill="url(#eye)"/></g>
    <path d="m107 183 28 38 58 15-22 53-35 31-25-55Z" fill="url(#cheek)" stroke="#67333c"/><path d="m333 183-28 38-58 15 22 53 35 31 25-55Z" fill="url(#cheek)" stroke="#67333c"/>
    <path d="m112 220 23 21 31 13-14 30-22 16-16-35Z" fill="#130f15" stroke="#43222c"/><path d="m328 220-23 21-31 13 14 30 22 16 16-35Z" fill="#130f15" stroke="#43222c"/>
    <path d="m220 188-20 42-23 58 22 24h42l22-24-23-58Z" fill="url(#ridge)" stroke="#79404a"/><path d="m220 224-16 63 16 9 16-9Z" fill="#09080b" stroke="#5d3039"/>
    <path d="m137 316 41-22 21 22h42l21-22 41 22-9 37-42 43-32 10-32-10-42-43Z" fill="url(#metal)" stroke="#6b3a43"/>
    <path d="m172 325 26 8h44l26-8-17 39-31 13-31-13Z" fill="#060609" stroke="#633039"/><path d="m190 334 10 4h40l10-4-6 10h-48Z" fill="#b8454b"/><path d="m201 351 19 4 19-4-7 11h-24Z" fill="#84303a"/>
    <path d="m151 329 14 33 26 25M289 329l-14 33-26 25M147 105l21-18M293 105l-21-18" stroke="#a6656c" opacity=".5" fill="none"/>
    <path d="m92 164-10 25 6 65 20 28M348 164l10 25-6 65-20 28" fill="#1a1118" stroke="#5a303b"/>
    <g fill="#fc4149"><rect x="84" y="200" width="3" height="30"/><rect x="353" y="200" width="3" height="30"/><path d="m213 80 7 4 7-4-7 24Z" opacity=".9"/></g><path d="m180 412-22 28m102-28 22 28M220 427v27" stroke="#63333e" strokeWidth="2"/>
  </svg>;
}
