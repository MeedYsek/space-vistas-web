import * as THREE from 'three'
import { PLANETS } from '../../config/planets'

/**
 * Shared live world positions for the solar system, written by each <Planet />
 * every frame and read by <CameraRig /> so the camera can follow a planet as it
 * orbits. The sun sits at the origin.
 */
export const sunPosition = new THREE.Vector3(0, 0, 0)
export const planetPositions: THREE.Vector3[] = PLANETS.map(() => new THREE.Vector3())
