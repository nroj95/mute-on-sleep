"""
main.py — backend of the Decky plugin MuteOnSleep (fork: nroj95/mute-on-sleep, upstream genc-v/mute-on-sleep).

What it does
  The frontend (src/index.tsx) calls mute_for_sleep() the moment Steam starts suspending.
  It then mutes the default output and sets its volume to the user's "Volume after waking"
  level (0 % by default, as upstream). Nothing happens on wake: the first + press unmutes
  and continues from that level, so waking the device never blasts sound.

Settings: <DECKY_PLUGIN_SETTINGS_DIR>/settings.json — {"enabled": bool, "volume_after_waking": 0–100}
Runs as root (plugin.json flag "_root"), so pactl is run as the deck user with its XDG_RUNTIME_DIR.

Fork changes: "volume_after_waking" setting (get/set methods), set_volume_zero renamed mute_for_sleep.
"""
import asyncio
import json
import os
import pwd
import decky

SETTINGS_PATH = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "settings.json")

# figure out who the deck user is from the homebrew install dir
_decky_home = os.environ.get("DECKY_HOME", "/home/deck/homebrew")
_deck_uid = os.stat(_decky_home).st_uid
_deck_user = pwd.getpwuid(_deck_uid).pw_name


def load_settings():
    try:
        with open(SETTINGS_PATH, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"enabled": True}


def save_settings(settings):
    os.makedirs(os.path.dirname(SETTINGS_PATH), exist_ok=True)
    with open(SETTINGS_PATH, "w") as f:
        json.dump(settings, f)


class Plugin:
    async def get_enabled(self):
        return load_settings().get("enabled", True)

    async def set_enabled(self, enabled):
        settings = load_settings()
        settings["enabled"] = enabled
        save_settings(settings)
        decky.logger.info(f"enabled: {enabled}")

    async def get_volume_after_waking(self):
        return load_settings().get("volume_after_waking", 0)

    async def set_volume_after_waking(self, percent):
        settings = load_settings()
        settings["volume_after_waking"] = max(0, min(100, int(percent)))
        save_settings(settings)
        decky.logger.info(f"volume after waking: {settings['volume_after_waking']}%")

    async def mute_for_sleep(self):
        settings = load_settings()
        if not settings.get("enabled", True):
            return

        volume = max(0, min(100, int(settings.get("volume_after_waking", 0))))
        decky.logger.info(f"muting audio, volume after waking {volume}%")
        xdg_runtime = f"/run/user/{_deck_uid}"

        mute_proc = await asyncio.create_subprocess_exec(
            "sudo", "-u", _deck_user, "env", f"XDG_RUNTIME_DIR={xdg_runtime}",
            "pactl", "set-sink-mute", "@DEFAULT_SINK@", "1",
            stderr=asyncio.subprocess.PIPE,
        )
        vol_proc = await asyncio.create_subprocess_exec(
            "sudo", "-u", _deck_user, "env", f"XDG_RUNTIME_DIR={xdg_runtime}",
            "pactl", "set-sink-volume", "@DEFAULT_SINK@", f"{volume}%",
            stderr=asyncio.subprocess.PIPE,
        )
        results = await asyncio.gather(mute_proc.communicate(), vol_proc.communicate())

        for i, (_, stderr) in enumerate(results):
            if stderr:
                decky.logger.error(f"pactl command {i} stderr: {stderr.decode()}")

    async def _main(self):
        decky.logger.info("MuteOnSleep loaded")

    async def _unload(self):
        decky.logger.info("MuteOnSleep unloaded")
