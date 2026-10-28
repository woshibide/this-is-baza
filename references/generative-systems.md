# Generative systems

An optional reference for choosing and implementing generative artwork in Baza.
Use individual sections as needed; the systems, recipes, and example values impose no workspace requirements.
Preserve supplied artwork and its behavior unless the user asks to change them.

## Find a starting point

Choose by the behavior the composition needs, then develop its framing, density, and motion.
Combining systems is useful when each contributes a visible purpose: a field can steer a flock, for example, while a mask concentrates its activity.

| System | Useful for | Main source of variation | Evaluation |
| --- | --- | --- | --- |
| [Physarum](#physarum) | Branching networks and shifting channels | Agents following their own deposited trails | Stateful agents and grid |
| [Strange attractors](#strange-attractors) | Dense filaments and chaotic trajectories | Nonlinear maps or differential equations | Iteration or integration |
| [Boids](#boids) | Flocks, schools, and coordinated groups | Local steering rules | Stateful agents |
| [Reaction–diffusion](#reactiondiffusion) | Growing spots, stripes, and cellular textures | Local reaction and diffusion | Stateful grid |
| [Differential growth](#differential-growth) | Folding contours and expanding linework | Repulsion, link constraints, and node insertion | Stateful chain |
| [N-body and orbits](#n-body-and-orbits) | Orbital paths, swarms, and close encounters | Forces and initial velocities | Stateful particles |
| [Metaballs](#metaballs) | Merging volumes and connected contours | Summed radial fields | Direct if centers are time functions |
| [Interference and moiré](#interference-and-moiré) | Bands, beats, and shifting geometric depth | Overlapping periodic structures | Direct |
| [Cellular automata](#cellular-automata) | Discrete growth, waves, and rule-based drawings | Neighbor states and transition rules | Stateful grid or agents |

Shared foundations: [coordinates and time](#coordinates-and-time), [noise and fields](#noise-and-fields), and [composition](#composition).
Formulas below are mathematical pseudocode, independent of any rendering library; `TAU = 2 * pi`.

## Coordinates and time

Define distances in logical composition units, independent of CSS size and export pixels.
For resolution-independent parameters, use a reference length `L = min(compositionWidth, compositionHeight)` and express distances as fractions of it.
Scale both axes by the same length to preserve circles and field structure across aspect ratios.
Keep simulation grids and agent populations independent of output resolution unless changing their density is intentional.

Distinguish three kinds of evaluation:

- **Direct:** compute the artwork from settings, seed, and composition time, in any time order.
- **Iterative:** generate a specified number of map iterations or grid generations; iterations need an explicit relationship to composition time if animated.
- **Integrated:** advance a state through fixed simulation steps; drawing another frame does not itself advance the simulation.

For stateful systems, choose a fixed step and a simulation rate appropriate to the model.
For example, motion measured in logical units per second can start with a `1/60`-second step, while reaction–diffusion commonly uses dimensionless model steps at a separately chosen rate.
Advance to requested composition times using that fixed schedule, with interpolation where meaningful.
Increase substeps when motion crosses important interaction distances in one step; changing display or export FPS should not change the dynamics.
For backward seeking, reset and replay or restore a complete checkpoint before the target time.

Seed the random generator and the noise initialization independently and reproducibly from the saved seed.
Generate static random attributes at initialization; random events during simulation belong to fixed steps, with stable update order.
Repeatable reconstruction also needs initial conditions and any authored interventions, not just a seed.
Warm-up is a specified number of simulation steps before visible time zero, performed identically during reconstruction.
Trails, chemical grids, random-generator state, and other accumulated data belong in a complete simulation snapshot.

When wiring exports, follow [export-system.md](export-system.md) for snapshot ownership and output sampling.
These recipes do not change its contract: an export continues from the captured preview state.
For requested beat relationships, [beat-timing.md](beat-timing.md) defines composition timing; the simulation consumes that time.

## Noise and fields

Separate the field from its renderer: a scalar field returns a value, while a vector field returns a direction and magnitude.
The same field can drive positions, line orientation, density, width, opacity, or color.
Check the implementation's output range before remapping noise; `[0, 1]` and approximately `[-1, 1]` are different conventions.

### Choose the noise for the structure

| Noise | Useful behavior | Implementation consideration |
| --- | --- | --- |
| Value | Broad drift and inexpensive scalar variation | Smooth interpolation avoids abrupt changes of slope at lattice boundaries; quintic interpolation also smooths second derivatives. |
| Perlin / gradient | Continuous surfaces and general motion fields | Lattice structure can become visible; derivative quality depends on the interpolation. |
| Simplex / OpenSimplex | Alternative directional character, including higher-dimensional fields | Pick an implementation supporting the required dimensions and seeding; cost and output range vary. |
| Worley / cellular | Cells, pores, ridges, and nearest-feature regions | `F1` is nearest-feature distance; `F2 - F1` highlights cell boundaries but is not an exact distance to them. |

For a 2D evolving field, sample an additional dimension: `n(x / featureSize, y / featureSize, time * evolutionRate)`.
Here `featureSize` is a logical distance and `evolutionRate` is noise-domain units per composition second.
Spatial scale, evolution rate, and particle speed are separate controls with different visual effects.
Translating coordinates makes a field travel; advancing the additional dimension changes its internal structure.
Choose either behavior deliberately, or combine them.

### fBm: combine scales

For noise with a consistent range, normalize the octave sum so octave count does not also become an accidental amplitude control:

```text
fbm(q, t) = sum(gain^i * n(lacunarity^i * q, t), i=0..octaves-1)
            / sum(gain^i, i=0..octaves-1)
```

Start with two octaves for broad steering and four for surface detail, with `gain = 0.5` and `lacunarity = 2`.
These are examples, not bounds: extra high-frequency detail may sharpen a texture while making particle motion twitchy.
Reduce unresolved octaves when zooming out or sampling on a coarse grid.
Derivatives amplify high frequencies, so curl and gradient fields may need fewer octaves or faster amplitude falloff than the visible scalar texture.

### Domain warping: distort coordinates

Use decorrelated scalar samples to build a vector displacement, then sample another field at the displaced coordinates:

```text
q = p / featureSize
w = (fbm(q + offsetA, t), fbm(q + offsetB, t))
value = fbm(q + warpStrength * w, t)
```

Use signed, roughly centered noise for `w` when the intent is distortion around the original location.
The offsets are distinct fixed vectors in noise coordinates; their exact numbers are not artistic parameters unless the sketch uses them that way.
Start with warp strength around `0.5` noise-domain units and increase until folds become legible.
A second warp can add structure, at the cost of more samples and harder-to-resolve detail.
Animate the warp, the final field, or both according to which structures should move.

### Convert fields into motion

**Angle:** with a scalar `f` remapped to `[0, 1]`, set `theta = TAU * turns * f + heading` and `v = speed * (cos(theta), sin(theta))`.
One turn across the scalar range is a useful starting point; increasing turns makes nearby directions separate more sharply.
Following `v` directly makes particles tracers; steering their velocity toward `v` with a response time adds inertia.

**Curl in 2D:** take a perpendicular gradient of a smooth scalar potential to build swirling flow.
Compute differences in noise coordinates, using the same epsilon for offsets and denominators:

```text
q = p / featureSize
dx = (n(q + (epsilon, 0), t) - n(q - (epsilon, 0), t)) / (2 * epsilon)
dy = (n(q + (0, epsilon), t) - n(q - (0, epsilon), t)) / (2 * epsilon)
v = strength * (dy, -dx)
```

Here `strength` converts the noise derivative to logical units per second; `epsilon = 0.01` is a starting sample spacing in noise coordinates.
An equivalent spacing in composition coordinates would be `epsilon * featureSize`.
Choose spacing small enough to resolve the field without losing differences to floating-point precision.
The continuous perpendicular-gradient construction is divergence-free; finite differences and particle integration approximate that property.
Multiplying by a constant preserves it, while normalizing each vector or multiplying velocity by a spatial mask generally does not.
For spatial modulation that preserves the construction, multiply the potential by a smooth mask before differentiating.
Curl can contain stationary points and closed trajectories; it does not guarantee that every particle keeps traveling across the frame.

**Gradient:** use `(dx, dy)` for ascent or its negative for descent.
It intentionally collects trajectories near extrema; use it for gathering or drainage rather than expecting even particle coverage.

### Periodic fields and seamless motion

For a loop of duration `T`, let `phase = TAU * time / T`.
With 4D noise, `n(x / featureSize, y / featureSize, radius * cos(phase), radius * sin(phase))` returns a periodic field.
The radius controls how far the loop travels through noise space.
All animated inputs must share compatible periods for the evaluated artwork to repeat.

A repeating field does not make integrated particle positions, trails, or a chemical grid return to their initial state.
For a requested seamless loop, prefer direct periodic geometry, a demonstrably periodic state, or an explicit transition whose seam is inspected.
Continuous simulations remain useful artwork without a loop.

## Composition

Shape the distribution of activity as deliberately as its local rules.
A ring, band, off-center cluster, obstacle, or sparse emitter can establish a composition before detail develops.
Use broad masks for density and negative space; use a separate, finer scale for local texture.
For divergence-free flow, apply the potential-masking approach above rather than masking velocity.

Map color to a readable system quantity such as density, speed, curvature, concentration, or age.
Choose the mapping's range intentionally so changing the population does not immediately saturate the image.
For accumulated density, a logarithmic or exposure-like mapping can retain both faint filaments and dense centers.
Trail duration, stroke width, opacity, and palette affect perceived density as much as agent count.
Keep trail decay and deposition tied to simulation time, including when a trail is implemented as a feedback texture.

## Physarum

**Use for:** networks that reinforce, merge, and reorganize through a shared trail field.

Each agent samples the field ahead and to either side, turns toward a stronger sample, moves, and deposits material.
Diffusion spreads the trail and decay removes old material.
Define tie handling explicitly, such as keeping the heading when forward is strongest and using seeded random turns when side samples tie above forward.

```text
read F, left, right from the previous trail field
turn each heading toward the preferred sensor, limited by turnRate * step
move agents by speed * step, applying the chosen boundary rule
accumulate deposits into a separate buffer
trailNext = diffuse(trailPrevious + deposits) * exp(-decayRate * step)
```

**Tune:** start with sensors about 30 degrees to either side and a sensor distance several movement steps ahead.
Specify sensor distance, agent speed, deposit amount per second, diffusion, and trail lifetime separately.
A ring or localized cluster makes outward organization visible; uniform initialization emphasizes an all-over network.
Use trail concentration for color or opacity.

**Watch:** a flat saturated field suggests excess deposition or long trail lifetime; isolated scribbles suggest sensing too locally or losing trails too quickly.
Diffuse with a stable stencil at a fixed grid scale, and let all agents sense the same previous field to avoid iteration-order bias.
For larger populations, GPU agent updates and trail buffers can help; choose the population from measured cost rather than a fixed platform promise.

## Strange attractors

**Use for:** filigree built from repeated nonlinear transformations, or projected chaotic trajectories.

Two discrete maps, with both new coordinates calculated from the same old `(x, y)`:

```text
Clifford:
  xNext = sin(a*y) + c*cos(a*x)
  yNext = sin(b*x) + d*cos(b*y)

De Jong:
  xNext = sin(a*y) - cos(b*x)
  yNext = sin(c*x) - cos(d*y)
```

For Clifford, `(a, b, c, d) = (-1.4, 1.6, 1.0, 0.7)` is a starting example to inspect.
Discard an initial transient, then accumulate samples into a density buffer and map that density to brightness.
Keep iteration coordinates separate from composition framing; choose a stable view after inspecting the bounds.
Orbit index, local displacement, or density can drive color.

For a continuous 3D alternative, Lorenz uses `dx/dt = sigma*(y-x)`, `dy/dt = x*(rho-z)-y`, and `dz/dt = x*y-beta*z`.
Start with `sigma=10`, `rho=28`, `beta=8/3`, a nonzero initial state, and a small fixed integration step such as `0.005` model-time units with RK4.
Project the resulting trajectory with a controlled camera.

**Watch:** parameters can yield a fixed point or short cycle, and interpolation between interesting parameter sets can pass through dull regions.
Small perturbations also need visual inspection; they carry no guarantee of preserving chaos.
For reliable motion, first consider revealing a fixed trajectory or rotating its view.
Separate sample count, exposure, and motion speed so a higher export resolution does not change the structure.

## Boids

**Use for:** coordinated movement whose large-scale shape emerges from local interactions.

For each agent, compute separation away from near neighbors, alignment toward neighbors' mean velocity, and cohesion toward their local center.
Convert each into a comparable steering acceleration before applying weights; raw position and velocity vectors have different units.

```text
acceleration = separationWeight * separationSteering
             + alignmentWeight * alignmentSteering
             + cohesionWeight * cohesionSteering
velocityNext = limitSpeed(velocity + limitAcceleration(acceleration) * step)
positionNext = position + velocityNext * step
```

**Tune:** try a separation radius around half the alignment/cohesion radius, then adjust the three weights independently.
Speed and maximum acceleration set the turning character; use a positive minimum speed when the intended creatures stay in flight.
Heading, local density, or turning rate can drive color.
Wrapping suggests open space, while avoidance or containment makes the boundary part of the piece.
With wrapping, use shortest wrapped displacements for neighbor distances and cohesion as well as position updates.

**Watch:** a single dense clump usually calls for less cohesion or more effective separation; jitter can indicate excessive steering or a large step.
Read neighbors from the same previous state and handle coincident positions without division by zero.
A uniform spatial grid reduces neighbor-search work for larger flocks, though dense clustering can still be expensive.

## Reaction–diffusion

**Use for:** patterns that grow and reorganize through local chemical interaction.

Gray–Scott stores concentrations `A` and `B` per grid cell:

```text
reaction = A * B * B
ANext = A + (Da * laplacian(A) - reaction + feed * (1-A)) * modelStep
BNext = B + (Db * laplacian(B) + reaction - (kill+feed) * B) * modelStep
```

One concrete convention uses a nine-point stencil with center weight `-1`, four axial weights `0.2`, and four diagonal weights `0.05`.
For that stencil, start with `Da=1`, `Db=0.5`, `modelStep=1`, `feed=0.055`, and `kill=0.062`.
Initialize `A=1`, `B=0`, then seed a small region with `B=1`.
These numbers depend on the stated discretization; changing the stencil or grid-spacing convention changes their meaning.

**Tune:** feed and kill together select the pattern regime; initial seed geometry and boundary conditions select how it develops.
Use a fixed grid independent of export pixels, and set model steps per composition second explicitly.
Map `B`, `A-B`, or the concentration gradient to color and relief.

**Watch:** an unseeded field stays uniform, and many parameter pairs erase the pattern rather than producing a different one.
Read both chemicals from old buffers and write both into new buffers; in-place updates introduce directional bias.
For exploding values, inspect the step and diffusion stencil before adding clamps that conceal instability.
A modest CPU grid is useful for exploration; a GPU ping-pong implementation helps with larger grids or many model steps.

## Differential growth

**Use for:** a contour that develops folds as more material is added.

Maintain an ordered chain, optionally closed.
Combine local repulsion with forces or constraints keeping adjacent chain nodes linked, then split links that exceed a chosen length.
Drive growth by increasing link rest lengths at a specified rate or adding outward pressure, depending on the intended behavior.
The added nodes provide new degrees of freedom; increasing a line's scale alone does not produce the same growth.

**Tune:** choose a target link length, a split threshold above it, and a repulsion radius initially around two target link lengths.
Growth rate, repulsion, link stiffness, and optional bending resistance determine whether the result ruffles, branches visually, or stays smooth.
Curvature, distance along the contour, and node age are useful color mappings.
Optional removal of very short links needs a lower threshold well separated from insertion to avoid repeated split/merge cycles.

**Watch:** repulsion reduces crowding but does not guarantee freedom from self-intersections.
If intersections are forbidden by the artwork, include segment collision handling and sufficiently small steps.
Compute movement from the old chain and apply topology changes afterward in stable order.
Use a spatial grid for local interactions and an explicit node budget; define whether growth pauses or the run ends at that budget.

## N-body and orbits

**Use for:** trajectories whose curves and close encounters arise from attraction.

For a particle attracted to a body with gravitational parameter `mu = G * mass`, use softened acceleration:

```text
d = attractorPosition - particlePosition
acceleration += mu * d / (dot(d,d) + softeningLength^2)^(3/2)
```

Softening is a logical distance; it limits the force near the center without a singular normalization at zero separation.
For a full N-body model, accumulate mutual forces from a common state; prescribed attractors are a simpler artistic model with different conservation behavior.
Use leapfrog or velocity Verlet for gravitational trajectories, with a step small enough to resolve close passes.

**Tune:** establish one attractor first, with tangential initial velocity around `sqrt(mu/r)` when `r` is much larger than the softening length.
Then explore multiple attractors, launch geometry, and trail lifetime.
Speed, orbital phase, or body identity can drive color.

**Watch:** close-pass explosions suggest an unresolved force scale or timestep.
Radial initial velocity tends toward plunging paths; drag dissipates orbital energy and can make particles spiral inward.
Use drag for intended decay rather than as a cure for unstable integration.
All-to-all interactions cost quadratically; a few prescribed attractors often suffice for a composition before an approximation such as Barnes–Hut is justified.

## Metaballs

**Use for:** smooth merging silhouettes, contour networks, and soft connections between moving centers.

Sum radial contributions and extract a level set:

```text
field(p) = sum(radius_i^2 / max(dot(p-center_i, p-center_i), epsilon^2))
inside = field(p) >= threshold
```

Here `epsilon` is a small logical distance guarding center singularities; the field and threshold are dimensionless.
For one ball, a threshold of `1` places the contour at its radius, outside the guarded region.
Use marching squares for contour geometry or a shader for filled and shaded fields.

**Tune:** center spacing relative to radius controls when connections form; threshold changes the shared silhouette.
Periodic paths give directly evaluable center motion; integrated centers make the overall system stateful.
Map field strength or its gradient to color, or use a narrow band around the level set for linework.

**Watch:** a coarse sampling grid can miss small lobes and change connectivity.
Interpolate edge crossings and resolve ambiguous marching-squares cells consistently.
Keep contour sampling in composition units for stable geometry across export sizes, then antialias the final drawing.
For many centers, compact-support kernels permit local queries, but changing the kernel changes the shape of merging regions.

## Interference and moiré

**Use for:** geometric bands and large apparent structures emerging from small differences in repeated patterns.

For unit directions `d1`, `d2`, spatial frequencies measured in cycles per logical unit, and phases in radians:

```text
wave1 = sin(TAU * frequency1 * dot(p, d1) + phase1)
wave2 = sin(TAU * frequency2 * dot(p, d2) + phase2)
value = wave1 + wave2
```

Nearby frequencies or directions create a slower beat envelope.
Replacing `dot(p,d)` with `length(p-center)` produces radial waves.
Overlaid line grids produce related moiré structures; their appearance also depends on how layers blend.

**Tune:** frequency difference, relative angle, and phase rate affect different aspects of the pattern.
Try two equal-frequency fields with a few degrees of angular separation, then vary one quantity at a time.
Map the sum to a palette, bands, or line widths according to the desired contrast.
Integer phase cycles over the chosen duration give a direct loop when all other inputs also repeat.

**Watch:** unintended pixel-grid moiré can dominate the authored interference and shimmer during motion.
Keep frequencies resolvable at the smallest preview size, filter sharp thresholds, or supersample.
Inspect both still frames and playback: a clean large export can hide aliasing in the working preview.

## Cellular automata

**Use for:** patterns whose structure comes from discrete states and local transition rules.

Specify the state alphabet, neighborhood, boundary rule, and generation rate as part of the artwork.
For synchronous automata, every cell reads the previous generation and writes into a separate next-generation buffer.

A cyclic automaton with `K` states advances a cell from `s` to `(s+1) mod K` when at least a chosen number of neighbors already have that next state.
As an exploratory recipe, try `K=12`, an eight-neighbor Moore neighborhood, threshold `1`, wrapping boundaries, and seeded random initial states.
Change state count, neighborhood, and threshold independently; different combinations can freeze, form waves, or remain disordered.
Map state through a cyclic palette when the last state should transition smoothly back to the first.

For path drawings, a turmite instead carries position and heading: read the cell, turn by its rule, change the cell state, and move one cell.
Its agent state is part of the snapshot alongside the grid.

**Watch:** in-place grid updates create scan-order effects rather than a synchronous automaton.
Tie generations to composition time so a faster display does not accelerate the rules.
Choose logical cell size for legibility, independently of export pixels; use deliberate crisp or filtered rendering.
When the grid becomes static or periodic, decide whether that behavior is the intended result before adding noise or changing the rules.
