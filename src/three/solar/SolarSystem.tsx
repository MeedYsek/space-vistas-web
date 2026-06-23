import Sun from './Sun'
import Planet from './Planet'
import Orbits from './Orbits'
import { PLANETS } from '../../config/planets'

/**
 * The whole orrery, centred at the world origin (the sun). Planets publish
 * their live positions to the registry for the camera to follow. On mobile the
 * orbit guides can be dropped via the `showOrbits` flag for a little headroom.
 */
export default function SolarSystem({ showOrbits = true }: { showOrbits?: boolean }) {
  return (
    <group>
      <Sun />
      {showOrbits && <Orbits />}
      {PLANETS.map((p, i) => (
        <Planet key={p.key} config={p} index={i} />
      ))}
    </group>
  )
}
