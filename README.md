# Mute On Sleep

![MuteOnSleep](assets/thumbnail.jpg)

Decky Loader plugin that mutes your Steam Deck's audio before it goes to sleep. No more loud audio when you wake it up in public.

## Install

Requires [Decky Loader](https://decky.xyz/). Grab the latest release zip and install it through the Decky store or drop it in your plugins folder.

## Build

```
pnpm install
pnpm run build
```

`pnpm run watch` for dev.

## How it works

Hooks into the Steam client's `SuspendResumeStore` via MobX to detect when the Deck is about to suspend, then runs `pactl` to set volume to 0% and mute the sink. There's a toggle in the plugin settings to turn it on/off. A "Volume after waking" slider (0–100 %, default 0 %) sets the level it goes to instead of 0 %, so the first + press after waking continues from there.

Heads up - since it mutes right before sleep, any other plugin trying to play audio at that exact moment (like boot animation plugins) will also get silenced.

## License

BSD 3-Clause
