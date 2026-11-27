# Character building

## 2. Character SVG layer hierarchy

Draw back-to-front. Every layer is a named `<g id="...">`. Props make colors customizable (`colors?.hair ?? "#3B2A20"`).

```
<svg viewBox="0 0 600 1200">
  <g id="shadow">            ground ellipse (standing) -- skipped when sitting_desk
  <g id="body-root">         breathing + sway transform (translateY / scaleY around hips)
    <g id="hair-back">
    <g id="leg-back"> <g id="leg-front">          (standing only; sitting_desk hides legs behind the desk)
    <g id="arm-back">        upper arm -> <g id="forearm-back" transform=rotate(a, elbowX, elbowY)> -> hand
    <g id="torso">           outfit, collar, neck
    <g id="head">            pivot at the neck; tiny tilt on gestures
      <g id="face">          skin, ears, nose, cheeks, freckles/scars
      <g id="eyes">          whites, pupils (offset by eyeLook), eyelids (blink), glasses
      <g id="eyebrows">      lerped from prevMood -> mood with moodBlend
      <g id="mouth">         9-viseme switch (see below)
      <g id="facial-hair">
      <g id="hair-front">    fringe, hat
    <g id="arm-front">       same elbow-pivot structure as arm-back
```

Mandatory behaviours:

- **Breathing:** `Math.sin(frame / 22)` drives a +/-3 unit `translateY` and a +/-0.4% `scaleY` on `body-root`.
- **Auto-blink:** a blink every ~105 frames: `const phase = frame % 105; const blink = interpolate(phase, [0, 3, 6], [1, 0.05, 1], { extrapolateRight: "clamp" })`. Offset the phase per character so two characters never blink together. Scale the eyelid/eye `scaleY` by `blink`.
- **eyeLook:** pupils translate by `eyeLook.x * 7` and `eyeLook.y * 5` units (clamped inside the eye white).
- **Mood eyebrows:** define a target `{ lift, tilt, curve }` per mood; blend `prev -> current` using `moodBlend` (already a Remotion `spring` computed by the composition). Mouth corners may follow the mood only while the mouth is `X`.
- **Gestures:** only when `isTalking === true`. Forearms rotate around the elbow pivot with `Math.sin` at different phases/frequencies per arm. Amplitude by `gestureIntensity`: `calm 6deg`, `moderate 14deg`, `expressive 26deg`. When `isTalking` is false the arms ease back to a rest angle with `spring`.
- **Poses:** `standing` draws the full body; `sitting_desk` draws torso up, hands resting/gesturing above the desk line (the desk is a foreground layer of the environment); `lying_floor` draws the full body collapsed horizontally, inside the 600-unit box width, resting on its bottom edge (the floor line), with no standing shadow. The environment must keep that floor area unobstructed.

## 3. Rhubarb viseme switch-case

Always implement all nine shapes. `X` is the closed/idle mouth.

```tsx
const Mouth: React.FC<{ shape: MouthShape }> = ({ shape }) => {
  switch (shape) {
    case "A": // closed, P / B / M
      return <path d="M-14 0 Q0 2 14 0" stroke={OUTLINE} strokeWidth={3} fill="none" />;
    case "B": // slightly open, clenched teeth: K / S / T / EE
      return <rect x="-16" y="-4" width="32" height="8" rx="3" fill="#6B2D2D" stroke={OUTLINE} strokeWidth={3} />;
    case "C": // open: EH / AE
      return <ellipse cx="0" cy="2" rx="16" ry="11" fill="#6B2D2D" stroke={OUTLINE} strokeWidth={3} />;
    case "D": // wide open: AA
      return <ellipse cx="0" cy="4" rx="18" ry="18" fill="#6B2D2D" stroke={OUTLINE} strokeWidth={3} />;
    case "E": // rounded, slightly open: AO / ER
      return <ellipse cx="0" cy="3" rx="11" ry="13" fill="#6B2D2D" stroke={OUTLINE} strokeWidth={3} />;
    case "F": // puckered: UW / OW / W
      return <ellipse cx="0" cy="2" rx="7" ry="8" fill="#6B2D2D" stroke={OUTLINE} strokeWidth={3} />;
    case "G": // upper teeth on lower lip: F / V
      return <path d="M-15 -3 H15 Q10 8 0 8 Q-10 8 -15 -3 Z" fill="#6B2D2D" stroke={OUTLINE} strokeWidth={3} />; // + white upper teeth rect
    case "H": // tongue up: L
      return <ellipse cx="0" cy="3" rx="15" ry="10" fill="#6B2D2D" stroke={OUTLINE} strokeWidth={3} />; // + pink tongue ellipse
    case "X": // idle / closed
    default:
      return <path d="M-12 0 Q0 3 12 0" stroke={OUTLINE} strokeWidth={3} fill="none" />;
  }
};
```

Adapt coordinates/proportions to each character's face; keep the shape semantics.

## Outfits and conditions

One component per character. Switch only the affected layers from `outfit` (clothes) and `conditions` (for example `acne`, `tired`, `stubble`); face, proportions and hair stay identical. Draw every state listed in the plan.

## QA

Use `animation.md` rules only if needed. Render one sheet, with props `{"characterId":"Mara","poses":["standing"],"outfits":[],"conditions":[]}`:

`npx remotion still src/index.ts CharacterSheet out/char_Mara.png --props=src/data/check.char.json --scale=0.5 --log=error`

Approved files are fingerprinted. Never edit a locked character; extending one requires the user to approve `npm run session -- unlock <id>`.
