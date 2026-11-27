# Environment building

## 7. Environment layer hierarchy

A background component receives `BackgroundProps` and renders, inside one `AbsoluteFill`:

```
<g id="back">          sky / wall / far scenery (colors by timeOfDay)
<g id="mid">           furniture, window with scrolling view, door (rotates by doorState), lamp (opacity by lightFlicker), phone prop (shake when phoneVibrate)
{children}             characterSlot: characters are injected here
<g id="foreground">    desk / counter / plants drawn IN FRONT of seated characters
```

Time-of-day palettes: `day` bright and neutral, `sunset` warm orange wash + long shadows, `night` desaturated blue wash with warm lamp glow. Props animate from frame/props only (e.g. phone shake = `Math.sin(frame * 2.4) * 4` while `phoneVibrate`). Wrap each layer in an SVG `<svg viewBox="0 0 1080 1920">` positioned absolutely so z-order is explicit: `back`, `mid`, `children`, `foreground`.

## QA

Props `{"environmentId":"Bedroom","characterId":"Mara","pose":"sitting_desk"}`:

`npx remotion still src/index.ts EnvironmentCheck out/bg_Bedroom.png --props=src/data/check.env.json --scale=0.5 --log=error`
