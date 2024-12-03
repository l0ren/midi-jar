import React from 'react';
import classnames from 'classnames/bind';
import { Note, Chord, ChordType } from 'tonal';
import { Chord as TChord } from '@tonaljs/chord';

import { useModuleSettings, useSettings } from 'renderer/contexts/Settings';
import useNotes from 'renderer/hooks/useNotes';
import { Notation, PianoKeyboard, ChordIntervals, ChordNameLink } from 'renderer/components';

// JLP
import { KeyboardSettings } from 'main/types';
import { defaultKeyboardSettings } from 'main/store/defaults';


import styles from './ChordDisplay.module.scss';



const cx = classnames.bind(styles);

type Props = {
  moduleId: string;
};

// JLP test here
const KEYBOARD_SETTINGS: KeyboardSettings = {
  ...defaultKeyboardSettings,
  skin: 'classic',
  from: 'C3',
  to: 'B5',
  label: 'chordNote',
  keyName: 'none',
  keyInfo: 'tonicAndInterval',
  textOpacity: 1,
  displaySustained: true,
  wrap: true,
  sizes: {
    radius: 0.4,
    height: 4,
    ratio: 0.6,
    bevel: true,
  },
};

// JLP copied from util.ts of ChordDetail module... resolve
function getChordInversionCopy(chord?: TChord, inversion = 0, octave = 3) {
  if (!chord) return [];

  const midi: number[] = [];
  const octaveMidi = Note.midi(`C${octave}`) as number;

  const notes = chord.notes
    .slice(inversion % chord.notes.length)
    .concat(chord.notes.slice(0, inversion % chord.notes.length));

  for (let n = 0; n < notes.length; n += 1) {
    let newMidi = Note.midi(`${notes[n]}${octave}`);
    if (newMidi) {
      while (newMidi < (midi.length ? midi[midi.length - 1] : octaveMidi)) {
        newMidi += 12;
      }

      midi.push(newMidi);
    }
  }

  return midi;
}

const ChordDisplayModule: React.FC<Props> = ({ moduleId }) => {
  const { settings } = useSettings();
  const { moduleSettings } = useModuleSettings('chordDisplay', moduleId);

  const { key, accidentals, staffClef, staffTranspose } = settings.notation;
  const {
    midiNotes,
    pitchClasses,
    sustainedMidiNotes,
    playedMidiNotes,
    chords,
    params: { keySignature },
  } = useNotes({
    accidentals,
    key,
    midiChannel: 0,
    allowOmissions: moduleSettings.allowOmissions,
    useSustain: moduleSettings.useSustain,
    detectOnRelease: moduleSettings.detectOnRelease,
    disabledChords: settings.chordDictionary.disabled,
  });

  if (!settings || !moduleSettings) return null;

  const {
    chordNotation,
    highlightAlterations,
    displayKeyboard,
    displayChord,
    displayName,
    displayNotation,
    displayAltChords,
    displayIntervals,
    keyboard,
  } = moduleSettings;

  // JLP
  const targetChord=Chord.getChord('maj13', 'Db')

  return (
    <div id="chordDisplay" className={cx('base')}>
      <div id="container" className={cx('container')}>
        {displayNotation && (
          <Notation
            id="notation"
            className={cx('notation', { 'notation--withChord': displayChord })}
            midiNotes={midiNotes}
            keySignature={keySignature}
            staffClef={staffClef}
            staffTranspose={staffTranspose}
          />
        )}
        <div id="display" className={cx('display')}>
          {displayChord && (
            <div id="chord" className={cx('chord', { 'chord--withNotation': displayNotation })}>
              <ChordNameLink
                chord={chords[0]}
                notation={chordNotation}
                highlightAlterations={highlightAlterations}
              />
            </div>
          )}
          {displayName && (
            <div id="name" className={cx('name')}>
              {chords[0] && chords[0].name}
            </div>
          )}
          {displayIntervals && (
            <div id="intervals" className={cx('intervals')}>
              <ChordIntervals
                intervals={chords[0]?.intervals}
                pitchClasses={pitchClasses}
                tonic={chords[0]?.tonic}
              />
            </div>
          )}
          {displayAltChords && (
            <div id="alternativeChords" className={cx('alternativeChords')}>
              {chords.map((chord, index) =>
                index > 0 ? (
                  <ChordNameLink
                    key={index}
                    chord={chord}
                    notation={chordNotation}
                    highlightAlterations={highlightAlterations}
                  />
                ) : null
              )}
            </div>
          )}
        </div>
      </div>
      {displayKeyboard && (
        <div className={cx('piano')}>
          <PianoKeyboard
            id="keyboard"
            className={cx('keyboard', {
              'keyboard--withNotation': displayNotation,
              'keyboard--withChord': displayChord,
            })}
            sustained={sustainedMidiNotes}
            played={playedMidiNotes}
            midi={midiNotes}
            // chord={chords[0] ?? undefined}
            chord={targetChord}
            targets={getChordInversionCopy(targetChord, 0)}
            keySignature={keySignature}
            // keyboard={keyboard}
            keyboard={KEYBOARD_SETTINGS}
          />
        </div>
      )}
    </div>
  );
};

export default ChordDisplayModule;
