/**
 * src/index.tsx — frontend of the Decky plugin MuteOnSleep (fork: nroj95/mute-on-sleep).
 *
 * Watches Steam's SuspendResumeStore.m_bSuspending (MobX observable, via its own observe_ hook)
 * and calls the backend's mute_for_sleep() the moment Steam starts suspending, so the sound stops
 * right when the power button is pressed instead of when the device actually sleeps.
 *
 * Panel: "Mute on sleep" switch and (fork addition) a "Volume after waking" slider, 0–100 % in
 * 5 % steps, default 0 % — the level the backend sets (muted) before sleep, so the first + press
 * after waking continues from there. Both settings are stored by the backend (settings.json).
 */
import { definePlugin, call } from "@decky/api";
import { PanelSection, PanelSectionRow, SliderField, ToggleField } from "@decky/ui";
import { useEffect, useState } from "react";
import { FaVolumeMute } from "react-icons/fa";

declare const SuspendResumeStore: {
  m_bSuspending: boolean;
};

function getSuspendObservable() {
  const sym = Object.getOwnPropertySymbols(SuspendResumeStore).find(
    (s) => s.toString() === "Symbol(mobx administration)"
  );
  if (!sym) return null;

  const admin = (SuspendResumeStore as any)[sym];
  return admin?.values_?.get("m_bSuspending") ?? null;
}

function MuteOnSleepPanel() {
  const [enabled, setEnabled] = useState(true);
  const [volumeAfterWaking, setVolumeAfterWaking] = useState(0);

  useEffect(() => {
    call<[], boolean>("get_enabled").then(setEnabled);
    call<[], number>("get_volume_after_waking").then(setVolumeAfterWaking);
  }, []);

  return (
    <PanelSection title="Mute On Sleep">
      <PanelSectionRow>
        <ToggleField
          label="Mute on sleep"
          description="When enabled, the sound is muted and the volume set to the level below right before the Deck goes to sleep"
          checked={enabled}
          onChange={(val) => {
            setEnabled(val);
            call("set_enabled", val);
          }}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <SliderField
          label="Volume after waking"
          description="The first + press after waking unmutes and continues from this level"
          value={volumeAfterWaking}
          min={0}
          max={100}
          step={5}
          showValue
          valueSuffix="%"
          disabled={!enabled}
          onChange={(val) => {
            setVolumeAfterWaking(val);
            call("set_volume_after_waking", val);
          }}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={{ fontSize: "0.75rem", opacity: 0.7, padding: "0 16px" }}>
          Note: Because volume is muted right before sleep, other plugins that
          play sounds (e.g. animation changers) may also be silenced at that
          moment.
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
}

export default definePlugin(() => {
  let unregister: (() => void) | null = null;

  try {
    const observable = getSuspendObservable();

    if (observable) {
      unregister = observable.observe_((change: any) => {
        if (change.newValue) {
          console.log("[MuteOnSleep] suspending, muting audio");
          call("mute_for_sleep");
        }
      });
    } else {
      console.warn("[MuteOnSleep] couldn't hook into SuspendResumeStore");
    }
  } catch (e) {
    console.error("[MuteOnSleep] failed to register suspend hook:", e);
  }

  return {
    name: "MuteOnSleep",
    content: <MuteOnSleepPanel />,
    icon: <FaVolumeMute />,
    onDismount() {
      unregister?.();
    },
  };
});
