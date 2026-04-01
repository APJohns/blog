import { useEffect, useRef, useState } from 'react';
import './time-dilation.css';
import Clock, { type ClockRef } from './Clock';

const dilation = (time: number, velocity: number) => {
  return time / Math.sqrt(1 - velocity ** 2);
};

export default function TimeDilation() {
  const [velocity, setVelocity] = useState(0);
  const [earthSecondsFromYou, setEarthSecondsFromYou] = useState(0);
  const [yourSecondsFromEarth, setYourSecondsFromEarth] = useState(0);
  const [localSeconds, setLocalSeconds] = useState(0);

  const [areHandsSmooth, setAreHandsSmooth] = useState(false);

  const earthFromYouRef = useRef<ClockRef>(null);
  const youFromEarthRef = useRef<ClockRef>(null);
  const youLocalRef = useRef<ClockRef>(null);
  const earthLocalRef = useRef<ClockRef>(null);

  const updateVelocity = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (isNaN(value) || event.target.value === '') {
      setVelocity(0);
      return;
    }

    if (value < 0 || value > 99) {
      return;
    }

    setVelocity(value);
  };

  const resetClocks = () => {
    setEarthSecondsFromYou(0);
    setYourSecondsFromEarth(0);
    setLocalSeconds(0);
    earthFromYouRef.current?.reset();
    youFromEarthRef.current?.reset();
    youLocalRef.current?.reset();
    earthLocalRef.current?.reset();
  };

  useEffect(() => {
    const earthFromYou = setInterval(
      () => {
        setEarthSecondsFromYou((prev) => prev + 1);
      },
      1000 / dilation(1, velocity / 100),
    );

    const youFromEarth = setInterval(
      () => {
        setYourSecondsFromEarth((prev) => prev + 1);
      },
      dilation(1, velocity / 100) * 1000,
    );

    resetClocks();

    return () => {
      clearInterval(earthFromYou);
      clearInterval(youFromEarth);
    };
  }, [velocity]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLocalSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={!areHandsSmooth ? 'step-hands' : ''}>
      <p>You're on a rocket flying away from Earth. 🌍 🚀</p>
      <p>Let's look at how your velocity compared to Earth affects your perception of time.</p>
      <div className="controls">
        <label htmlFor="velocity">Velocity</label>
        <div className="velocity-slider">
          <input type="range" name="velocity" min="0" max="99" step="1" value={velocity} onChange={updateVelocity} />
          <input
            type="number"
            id="velocity"
            name="velocity"
            min="0"
            max="99"
            step="1"
            value={velocity}
            onChange={updateVelocity}
          />
          <span>% of the speed of light</span>
        </div>

        <p className="no-margin">
          Every second you experience on your rocket is{' '}
          <output htmlFor="velocity">{dilation(1, velocity / 100).toPrecision(3)}</output> seconds on Earth.
        </p>
      </div>

      <details className="clock-settings">
        <summary>Clock settings</summary>
        <div className="clock-controls">
          <label className="smooth-hands-control">
            <input
              type="checkbox"
              checked={areHandsSmooth}
              onChange={(event) => setAreHandsSmooth(event.target.checked)}
            />
            Smooth hands
          </label>
          <button type="button" className="reset-clocks" onClick={resetClocks}>
            Reset clocks
          </button>
        </div>
      </details>

      <div className="clock-sets">
        <div>
          <h2>From your perspective</h2>
          <div className="clock-row">
            <div className="clock-card">
              <Clock elapsedSeconds={localSeconds} ref={youLocalRef} timezone="ROCKET" />
            </div>
            <div className="clock-card">
              <Clock
                elapsedSeconds={earthSecondsFromYou}
                dilationFactor={dilation(1, velocity / 100)}
                ref={earthFromYouRef}
                timezone="EARTH"
              />
            </div>
          </div>
        </div>

        <div>
          <h2>From Earth's perspective</h2>
          <div className="clock-row">
            <div className="clock-card">
              <Clock
                ref={youFromEarthRef}
                elapsedSeconds={yourSecondsFromEarth}
                dilationFactor={1 / dilation(1, velocity / 100)}
                timezone="ROCKET"
              />
            </div>
            <div className="clock-card">
              <Clock elapsedSeconds={localSeconds} ref={earthLocalRef} timezone="EARTH" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
