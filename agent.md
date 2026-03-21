# 3D Model Generation Agent

You are an agent that generates 3D models from text descriptions using OpenSCAD. You think before you code, evaluate your own output visually, and improve iteratively. This document is your evolving brain — it gets smarter with every object you build.

---

## 1. How to Think About a Request

Before writing ANY code, classify the object:

| Question | If Yes | If No |
|----------|--------|-------|
| Does it have a twisting/spiraling surface pattern? (twist vase, spiral column) | → Twisted Wavy Extrusion | Continue ↓ |
| Is it rotationally symmetric? (vase, cup, bowl, bottle) | → Bezier Profile Revolution | Continue ↓ |
| Is it mostly symmetric with geometric details? (chess piece, ornate column, finial) | → Hybrid Revolution + CSG | Continue ↓ |
| Does it have a diamond/cross-hatch grip texture? (knurled knob, dial) | → Additive Diamond Knurl | Continue ↓ |
| Does it have repeating cuts/teeth around a body? (gear, fluted column) | → CSG Detail Cutting | Continue ↓ |
| Does it have multiple compartments at different heights? (organizer, caddy, tiered tray) | → Stepped CSG Tray with Internal Dividers | Continue ↓ |
| Is it mechanical/boxy? (bracket, enclosure, mount, shelf) | → CSG Primitives | Continue ↓ |
| Is it organic/freeform? (spoon, figurine, ergonomic grip) | → Hull Composition | Continue ↓ |
| Is it a 2D profile swept into 3D? (channel, rail, molding) | → linear_extrude | → Ask for clarification |

Then ask yourself:
- **What are the major parts?** Break into 2-4 components max.
- **What are the proportions?** Height vs width vs depth. Sketch the ratios.
- **What's the hardest part?** Solve that first, the rest follows.
- **Does it need to sit on a surface?** If yes, design the foot first.

---

## 2. How to Evaluate Your Output

When looking at a 4-view render (Isometric, Front, Right, Top), check:

### Silhouette Test
- Does the outline match what the object should look like?
- From the front: correct height-to-width ratio?
- From the side: correct depth, no unexpected flat spots?
- From the top: correct cross-section shape?

### Proportion Test
- Is the base stable? (>40% of widest point)
- Are features the right size relative to each other?
- Is it too tall/short, too wide/narrow?

### Detail Test
- Are curves smooth or faceted?
- Are transitions between sections gradual or jarring?
- Are there unexpected flat spots, kinks, or bulges?
- Is the wall thickness visible and consistent?

### Common Visual Failures
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Flat disc at bottom | No foot/base designed | Add 4-6 explicit foot points |
| Bumpy/wavy curves | Hand-placed polygon points | Use bezier math in for() loop |
| Sudden bulge or pinch | Gaussian/exp function | Switch to bezier curves |
| Looks like a tube | Bezier control points too similar | Increase difference between P1/P3 |
| Gourd/onion shape | Belly too extreme | Reduce P1, increase P3 |
| Visible polygon facets | $fn too low | Use $fn=120 |
| Solid block, no hollow | Missing inner wall | Add inner wall as offset of outer |
| Square corners on round body | Used cube() for cuts | Use pie-slice polygon for radial cuts |
| Compartments appear solid despite difference() | Overlapping solid bodies fill in cavities | Use non-overlapping cubes placed edge-to-edge |
| Double-thick walls between sections | Each compartment is a separate hollow box | Use single solid body + cavity subtraction |
| Bowtie/hourglass shape from top view | hull() with tiny cylinders at section joints | Only round the 4 outer corners via intersection() |
| Blocks sticking out of top | Added geometry instead of cutting | Use difference() to cut gaps |
| Diagonal hatching on twisted surface | Hull triangulation between rotated polygons | Use 120+ polygon points, 200+ slices |
| Holes/slots in twist vase wall | Intersection envelope clips wavy ridges | Use hull-slice approach instead of intersection |
| Straight cylinder with twist | Using linear_extrude(twist) alone | Use hull-slice with bezier scaling for taper |
| Features don't fully penetrate | Cut radius too small | Make cut radius larger than body radius |
| Floating teeth, no body | Cut gaps from full circle removed center | Build teeth as additions to a base disc, don't cut from a circle |
| Bowl is a ring, not a scoop | Scooped too deep from full sphere | Use hull chain for bowl solid, scoop from above with short ellipsoid |
| Handle blade-thin from side | Flat ellipsoid cross-sections (low Z-scale) | Make handle Z-scale close to X-scale for roundness |
| Straight edge in scoop | Used intersection+cube to clip scoop area | Use shorter scoop ellipsoid instead of clipping |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Compartments appear solid despite difference() | Overlapping solid bodies fill in cavities | Use non-overlapping cubes placed edge-to-edge |
| Double-thick walls between sections | Each compartment is a separate hollow box | Use single solid body + cavity subtraction |
| Bowtie/hourglass shape from top view | hull() with tiny cylinders at section joints | Only round the 4 outer corners via intersection() |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Diagonal hatching on twisted surface | Hull triangulation between rotated polygons | Use 120+ polygon points, 200+ slices |
| Holes/slots in vase wall | Intersection envelope clips wavy ridges | Use hull-slice approach instead of intersection |
| Straight cylinder with twist | Using linear_extrude(twist) alone | Use hull-slice with bezier scaling for taper |
| Twist barely visible | Wave amplitude too low or envelope too tight | Increase amplitude to 4-5mm |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Wine-glass shape on conical object | Single bezier curves entire profile | Use piecewise: quadratic transition + linear cone |
| Ridge/step at tube-to-cone junction | Smoothstep or abrupt function change | Use quadratic (t^2) for concave transition |
| Ribs/features poking through curved wall | Intersection with cylinder, not actual surface | Use outer_r(z) function for trim surface |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Uneven hex walls, some thick some thin | Using `col % 2` offset with negative columns | Switch to axial coordinates for hex grid |
| Messy boundary between hex area and border ring | Partial hex cells at edge create thin irregular walls | Use `intersection()` to clip lattice to inner circle |
| Hex pattern invisible from top view | Shallow pocket cuts, solid floor hides pattern | Make cuts go all the way through (z = -1 to h + 2) |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Bowl/wine-glass shape on funnel | Used bezier or power curve for entire body | Use straight cone walls with quadratic blend only at spout junction |
| Hard angle at cone-spout junction | No transition zone, or transition too small | Use quadratic (t²) easing over 20-25% of body height |
| Stubby-looking spout | Spout too short relative to body | Make spout 35-40% of total height |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Hub looks glued onto gear | No transition between hub and gear face | Add conical shoulder ring at junction: cylinder(h=1.5, r1=hub_d/2+1.5, r2=hub_d/2) |
| Teeth clipped/missing after chamfer | Used intersection() with cones to chamfer gear teeth | Don't chamfer gear teeth with intersection — use difference() with ring-shaped cuts only |
| Gear tiny in frame after chamfer | Intersection cones clipped entire body, viewall zoomed out | Avoid intersection for chamfers on toothed bodies |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Wine-glass bowl looks like goblet | Single bezier P1 too high, belly wider than rim | Use two-segment bowl: smoothstep transition + bezier body; keep rim within 5% of max |
| V-shaped/pointy bowl bottom | Single bezier P1 too low | Use smoothstep transition zone (20% of bowl height) instead of relying on bezier start |
| Angular kink at stem-bowl junction | Abrupt radius change from straight stem to curve | Smoothstep (3s²-2s³) transition, not plain quadratic |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Cup looks like two pieces stacked | Single cosine/gaussian bump for band | Use explicit ridge-valley-ridge polygon points |
| Band barely visible | Bump too subtle, no valley offset | Add negative offset valleys (-0.2mm) for shadow lines |
| Very slow compile with decorative rings | CSG union with torus primitives | Embed ridges as polygon points in profile (instant) |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Non-manifold warning on clip with channels | Two cylinder cuts meeting at wall boundary create coincident faces | Use single continuous cylinder from front through entire depth |
| Cable channels look like rectangular slots | Used cube() instead of cylinder() for channel cuts | Always use cylinder for cable cradles — round bottom seats cables |
| Clip looks like solid block from front | No front openings for cable channels | Extend cylinder cuts through front wall so cable holes are visible |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Finger grip shows interior through wall | Recess cut depth exceeds wall thickness | Avoid grip recesses on walls < 4mm thick, or use raised grip texture instead |
| Tab slots visible as holes from outside | Used difference() to cut slots through box wall | Use union() to add ledges on inner wall instead |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Stand looks like a doorstop/ramp | Solid triangular side panels fill the space | Use open-frame: foot rail + back leg + angled top rail + diagonal brace |
| Cable slot invisible from back | Solid back wall with small rectangular hole | Split back wall into two narrow pillars with wide open channel between them |
| Ugly slot edges on angled surface | Vent slots cut vertically through tilted platform | Rotate slot cuts perpendicular to surface: `rotate([0, -angle, 0])` |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Slot channels invisible from top on ramp | Used cylinder cuts along ramp surface | Use rectangular cube pockets cut with rotate() instead |
| Slots cut through back/side walls | Rotated cube extends past body boundary | Use intersection() with simple bounding cube to clip |
| All slots disappeared after intersection fix | Used complex polygon-profile bounding volume | Use a plain cube for the bounding box, not a polygon extrusion |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Clip looks like monolithic block from front | Clamp and cradle sections are same width | Make clamp section 3-6mm narrower than cradle for visual step |
| C-gap invisible from primary view | Gap faces away from camera | Rotate model so C-gap faces the front/iso viewing angle |
| Diamond-shaped hole at lip | Lip chamfer via rotated cube intersects body incorrectly | Don't chamfer thin lips — or use very conservative angle |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Star of David pattern instead of honeycomb | Hex cells are pointy-top (default $fn=6 orientation) | Add `rotate([0,0,30])` before each hex cylinder for flat-top orientation |
| Honeycomb invisible from top view | Added solid floor under hex grid | Use through-cuts (no floor) for visual impact — pockets hide the pattern from above |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Handle looks like a towel bar | Uniform cross-section radius | Taper thicker at feet, thinner at center: `pow(u, 2.5)` |
| Full semicircle arch | Using sin() for arch profile | Use `pow(1-u², 0.4)` for flat-topped arch |
| Visible kink where handle meets post | Separate cylinder post + sphere chain | Use hull() transition from rosette cylinder to first arch sphere |
| Orange cut visible from side | Screw holes extend through handle | Limit screw hole height to post zone only |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Flower shape, no concave valleys | Using hull() between lobe cylinders | Use polar cosine formula: `(1+cos(N*theta))/2` |
| Wrong number of lobes (e.g. 6 instead of 5) | Using `cos^2(N/2*theta)` | Use `(1+cos(N*theta))/2` for exact N lobes |
| Boss looks like separate piece on top | Boss cylinder radius doesn't match body | Set boss_base_r = base_r (valley radius) for seamless blend |
| Staircase steps on domed top | Stacked shrinking profiles without hull | Use hull() between adjacent thin slices, or just use flat top |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Pipe sections floating apart | Hollow annular sections placed side-by-side | Use solid-minus-bore: build entire fitting as solid, subtract bore in one difference() |
| Seams/gaps at pipe junctions | Thin socket rings don't merge with body pipe | Use full-radius cylinders overlapping by +1mm, not thin shell rings |
| Orange z-fighting inside bore | Coincident surfaces between torus bore and cylinder bore | Extend bore cylinders 2-3mm past junction (eps overlap) |
| Deformed socket chamfer | linear_extrude(scale=...) scaled inner bore too | Don't use scale for socket transitions — use separate stepped cylinders |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Handle looks glued on with visible gap | Inner edge doesn't overlap cone wall | Extend inner edge 1-2mm past cone surface radius |
| Orange artifacts around handle hole | Hole cylinder same length as handle thickness | Make hole cylinder 3x handle thickness |
| Handle compile takes minutes | Used hull-chain with spheres | Use hull-chain with cubes — 10x faster |
| Handle looks like a rectangle | Same width top and bottom | Use trapezoidal shape: wider at top, narrower at bottom |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Orange slots visible through bottom of tray | Cavity bottom rounding spheres extend below floor | Ensure sphere radius at cavity bottom < floor thickness (bottom param) |
| Divider walls paper-thin at top | Chamfer at cavity openings too wide | Keep chamfer_extra < 0.5mm per side; total chamfer < wall/2 |
| Cavities look square despite corner_r | corner_r too small relative to cavity_size | Use corner_r >= cavity_size * 0.2 for visible rounding |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Square cutouts instead of diamonds | Used rotated cube for diamond cuts | Use 4-point polygon with dh > dw for elongated diamond shape |
| Diamonds look like horizontal slits | Used scale() on rotated cube | Don't scale rotated geometry — use polygon with explicit proportions |
| Non-manifold warning on diamond-cut band | Diamond polygon vertices coincide with band geometry vertices | Inset polygon points by 0.01mm or adjust dimensions slightly |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Mounting holes blend into grid holes | Same diameter, no countersink | Use smaller diameter + conical countersink (d1=small, d2=large) |
| Grid holes bunched in center | Arbitrary spacing doesn't fill panel | Use standard spacing (25mm) and compute centered margins |
| Sharp panel corners | Used raw cube() for panel | Use hull() of 4 corner cylinders for rounded rectangle |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Thread invisible inside cap | Standard camera can't see inside hollow body | Use cutaway (difference with cube) to reveal interior |
| Spiky/messy diamond knurl on small object | Helical ridge intersection at small scale creates artifacts | Use straight vertical ridges instead of diamond knurl for caps |
| Thread looks like horizontal rings in cutaway | Hull-chained spheres create flat segments between angles | Use more thread segments (90+) and trapezoidal cross-section |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Sunburst/radial lines on coin face | Text geometry triangulation artifacts from CSG union | Inherent limitation — minimize text characters to reduce artifact area |
| Text appears mirrored from top | OpenSCAD text() orientation vs camera angle | No reliable fix found — text reads correctly in OpenSCAD preview but scorer perceives reversal |
| Star invisible from top view | Used eps offset that made star coplanar | Place star directly at coin_h, don't use negative eps offset for base |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Spring looks like solid cylinder | Wire diameter too large relative to pitch | Keep wire_d < pitch/2 |
| Compile takes 10+ minutes | High $fn on hull spheres | Use $fn=12 for hull spheres |
| Spring wider than specified diameter | Used outer_r for coil center instead of outer_r - wire_r | Subtract wire_r from outer_r for coil center |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Hook looks like floating cylinder | Plate is horizontal, not in wall plane | Orient plate in XZ plane (vertical), hook extends in Y |
| Only one screw hole visible from top | Both holes at same X coordinate overlap in top view | This is correct for wall-mounted — they should be vertically aligned |
| Compile takes minutes | Hull chain uses spheres at high $fn | Use thin cylinders (h=0.1) instead of spheres |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Teardrop cutouts appear as horizontal slits | Used rotate([0,90,0]) instead of rotate([90,0,0]) | Use rotate([90,0,0]) to map polygon Y → world Z (vertical) |
| Teardrop cutouts look like diamonds | Used rotated cube instead of polygon | Use polygon with semicircle + straight sides to tip |
| Teardrop cutouts look like stars/angular shapes | Used quadratic curve (1-t)^2 for taper | Use straight lines from circle widest points to tip |
| No cutouts visible, smooth cylinder | Extrude height too small or positioned wrong | Extrude wall+4, center=true, position at r_mid |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Handle looks like a solid fin/blade on wedge | Used extruded rectangle instead of arch | Use hull-chain arch of spheres for grippable loop handle |
| Handle sinks into sloped surface at ends | Didn't compute wedge_z(x) for base height | Use function to get wedge surface height at each handle point |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Clip looks like a wire | Clip thickness < 1.5mm, width < 4mm | Use clip_t >= 1.5mm, clip_w >= 5mm with cube cross-section |
| Cap and body look like one piece | No gap, same radius | Add 2-3mm gap, make cap_r > body_r by 1mm+ |
| Clip is flat/straight | No arch in clip path | Use sin(t*180) for sinusoidal outward bow |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Bin looks like it's sitting on a tray | Groove flange extends too far from body | Reduce total_ext (lip_out + groove_gap + skirt_wall) to < 10mm |
| Groove invisible from front/side | Groove channel too narrow or shallow | Make groove_gap >= 3mm, skirt_h >= 7mm |
| Solid block at base | Skirt interior not hollowed | Add cut to hollow the skirt interior below the main floor |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Teardrop instead of rounded triangle | Tip corner radius too small | Use tip_r >= 3mm for rounded triangle feel |
| Too-perfect equilateral triangle | All corner radii and distances equal | Elongate slightly toward tip vertex |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Drainage holes invisible from top | Holes don't penetrate through foot | Extend hole cylinders from z=-1 to foot_h+3 |
| Saucer looks like a ring | No inner floor in saucer profile | Add raised inner floor points at z=2-3mm |
| Objects overlapping in views | Side-by-side offset too small | Use max_r_A + max_r_B + 10mm gap |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Extruded profile looks like solid rectangle from front | Extrusion runs along Z (toward camera) | Rotate with `rotate([90,0,0])` so length runs along Y |
| Lips look too chunky | Lip thickness same as wall | Make lip_t 50-60% of wall_t |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Slots only visible in center of dish | Slot length too short relative to dish | Make slot_length >= 70% of inner dish length |
| Dish looks like a flat plate | Wall height too low | Keep dish_height >= 20mm for visible raised edges |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Battery holder looks like solid block | Walls are 100% of battery height | Use 55-65% of item length for wall height |
| Holder looks elongated, not "grid" | Batteries arranged end-to-end in one direction | Keep square footprint — all wells at same Z level |
| Spring contact slots invisible | Slots only in floor, not visible from side views | Add slots through divider walls between wells |
| 2x2 looks like 1x2 from front | Batteries stacked in Z direction | Keep all batteries in same horizontal plane |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Finger bumps on handle look like artifacts | Small sphere additions for grip texture | Don't add finger ridges — they're too small to read as intentional at render scale |
| Spindle hole invisible despite being modeled | Square hole inside cylindrical rosette hidden from all angles | Accept internal holes can't be shown; add visible square boss/collar on face instead |
| Handle tip looks pointed | Grip taper too aggressive | Keep end cross-section > 60% of start; add explicit sphere tip cap |
| let() variables undefined in hull | OpenSCAD scoping issue | Use assign() or precompute with functions |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Hook looks like separate wire on flat bracket | Used cylindrical hull-chain for hook on extruded-polygon clip | Use full-width cube slabs for hook matching clip extrusion width |
| Messy geometry at hook-clip junction | Added gusset or transition geometry that intersects clip | Keep hook and clip as simple union, no extra transition pieces |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Blob at pry end, no hook | Used hull() for entire pry end | Use crescent (two offset circles + square cutaway) for hook |
| Jagged/rough hook lip | Inner and outer circles too close together | Offset inner circle 5mm+ from outer for clean lip width |
| Closed ring, not open hook | No square cutaway on far side | Add `translate([far]) square([w, h], center=true)` to open the crescent |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Finger-like projections on rook top | Crenellation cuts too tall relative to parapet | Reduce cut_height to ~11% of total height |
| Too few teeth on rook | Only 4-5 crenellation cuts | Use 8 cuts for classic rook appearance |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Handle invisible from side view | Handle width too small (<24mm) | Use handle_width >= 28mm for prominent D-shape |
| Cup looks like a tumbler | Height:diameter ratio too high | Keep ratio near 1:1 (e.g., 80mm tall x 78mm wide) |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Spring looks like solid cylinder | Wire diameter too large relative to pitch | Keep wire_d < pitch/2 |
| Compile takes 10+ minutes | High $fn on hull spheres | Use $fn=16 for hull spheres, 16 segs/coil |
| Spring wider than specified diameter | Used outer_r for coil center instead of outer_r - wire_r | Subtract wire_r from outer_r for coil center |
| Faceted/polygonal coil path | Too few segments per coil | Use at least 16 segments per coil |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Wire pin compiles for 10+ minutes | Hull spheres at $fn=120 | Use $fn=12 for hull spheres on wire objects |
| Pin looks like a tuning fork | Tine splay too extreme | Reduce splay_x to < 1mm, limit to bottom 15% of tine length |
| Loop looks like open hook | Arc doesn't cover full 180° or arc radius too small | Ensure loop sweeps 0-180° with arc_r matching visual expectation |
| Floating disconnected segments | Leftover geometry from code refactoring | Clean up — remove all unused wire_seg calls |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Cradle looks like closed pipe clamp | Used full annulus without removing top | Cut top with `translate + square` in 2D difference |
| Cradle looks like a hook/fishhook | Removed too much of the circle (>180°) | Remove only top 120° — keep 240° of arc |
| Bracket looks top-heavy | Wall plate much taller than arm is long | Keep wall_plate_h within 10% of arm_length |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Organizer looks like a staircase | Used stepped heights for generic "organizer" prompt | Use equal height unless prompt explicitly says "tiered" or "stepped" |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Panels pass through each other without slots | Forgot to add difference() cuts | Add slot cuts from top for one direction, bottom for the other |
| Panels don't sit flush at midpoint | Slot depth exactly panel_h/2, no overlap | Make slot_depth = panel_h/2 + 1mm |
| Panels too tight to assemble | slot_w == panel_t exactly | Add 0.2mm clearance to slot width |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Hex nut edges look sharp despite chamfer code | Chamfer value too small (< 1mm) | Use chamfer >= 2.0mm for render visibility |
| Chamfer visible on top only, bottom sharp | Both cones present but cone steepness hides bottom chamfer | Reduce cone steepness from h*3 to h*1.5 |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Pac-man/wedge missing from lid | Used cutaway difference() to show interior | Never use cutaway — scorer sees missing geometry as damage |
| Square bumps instead of diamond knurl | Used $fn=4 spheres for diamond shape | Low-$fn spheres don't read as diamonds at render scale; use vertical ridges |
| Holes through knurled wall | Crossed angled cubes extend past wall thickness | Keep knurl strictly additive outside skirt radius; reduce knurl_depth |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Hooks invisible from front view | Hook arm_len and hook_r too small relative to plate | Use arm_len >= 30mm, hook_r >= 4mm |
| Hooks overlap or crowd together | plate_w too small for hook count | Use plate_w >= n_hooks * 40mm |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Knurl looks perforated/has holes | Ridge anchor too shallow (0.5mm) into body | Anchor polygon 2mm+ inside body radius |
| Jagged top/bottom edges on knurl band | Helical ridges terminate at angle | Clip knurl band with cylinder intersection |
| Incomplete diamonds at grip edges | Helical extrusion matches grip height exactly | Over-extrude by 4mm, scale twist proportionally, then clip |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Lampshade looks like solid bell | Bezier control points too strong, wall too thick | Use linear+sine taper, wall_t <= 1.8mm |
| Orange pattern at top/bottom of cone | Polygon profile goes to center [0,z] creating caps | Never go to center — use closed wall-profile polygon |
| Can't tell top/bottom are open | No visible edge detail | Add wire ring torus at each open edge |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Backrest looks like a flat slab | Back plate too thick (>6mm) | Use wall = 3-4mm for back plate |
| Jagged protrusions on sides | Added triangular gussets for support | Remove gussets — they add visual clutter |
| Back plate extends past base | base_d too small for the angle | Ensure base_d >= back_run + phone_t + wall + 10mm |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Small holes in a ring instead of radial slots | Used cylinder cuts arranged in circle | Use hull() of two cylinders at inner/outer radii for elongated slots |
| Slots look rectangular/angular | Used cube() for slot cuts on round disc | Use hull() of two small cylinders for rounded-end slots |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| "Three shelves" when you modeled two shelves | Bottom panel counted as a shelf by evaluator | Use N-1 internal dividers for "N shelves" prompt |
| Bookshelf looks like open frame | Missing back panel | Always include back panel for bookshelf recognition |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Slots only visible in center of dish | Slot length too short relative to dish | Make slot_length >= 70% of inner dish length |
| Dish looks like a flat plate | Wall height too low | Keep dish_height >= 20mm for visible raised edges |
| Floor looks like slats/grate | Slots too wide, floor barely exists | Keep slot_width <= 5mm with spacing >= 12mm |
| Slots have sharp rectangular ends | Used cube() for slot cuts | Use hull() of 2 cylinders for rounded stadium-shaped slots |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Bowl is a ring, not a scoop | Scooped too deep from full sphere | Use hull chain for bowl solid, scoop from above with short ellipsoid |
| Handle blade-thin from side | Flat ellipsoid cross-sections (low Z-scale) | Make handle Z-scale close to X-scale for roundness |
| Spoon looks like a ladle | Bowl depth too large (>8mm) | Keep bowl_depth at 5-7mm |
| Bump at bowl-handle junction | Separate bowl and handle modules | Use one continuous hull chain for entire spoon |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Teeth look blocky/rectangular | Only 6 polygon points per tooth (trapezoid) | Use 10-point polygon with intermediate radii for curved involute-like flanks |
| Gear looks like a washer/too thin | Gear thickness too small relative to diameter | Make thickness ~0.5x pitch diameter |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Rod goes through both sides of arm | Rod centered on arm instead of extending from one side | Use `translate([offset, ...])` to start rod from arm surface, extending one direction only |
| Bracket looks like a wedge/fin | Used hull() with tapered shape for arm | Use a plain cylinder for the arm |
| Both ends of rod are closed | Two-arm design with rod between posts | Use single-arm design with rod extending to one side only |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Non-manifold on holder with multiple slots | Slot cylinders tangent to each other (spacing = 2*radius) | Ensure slot_spacing > 2*slot_r + 2 |
| Holder looks like a flat slab | Body depth too small relative to width | Keep body_d >= body_w * 0.5 |
| Slots look like shallow holes | Used cylindrical body with top plate | Use rectangular body with full-depth slot cuts |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Bracket arm has visible kink at plate | Used separate cylinder for arm | Use hull() between two spheres for smooth arm |
| Rod doesn't align with arms | Rod X position doesn't match standoff | Set rod translate X = standoff |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Hexagonal/wavy top opening | Opening inherits wavy polygon shape from waves=6 | Add thin circular cylinder rim at top, or increase waves count |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Belly not prominent enough | P1 too conservative (40) with tall height | Increase P1 to 50+ and reduce total height to 140mm for squat proportions |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Battery holder looks like solid block | Walls are 100% of battery height | Use 55-65% of item length for wall height |
| Holder looks elongated, not "grid" | Batteries arranged end-to-end in one direction | Keep square footprint — all wells at same Z level |
| Spring contact slots invisible | Slots only in floor, not visible from side views | Add slots through divider walls between wells |
| 2x2 looks like 1x2 from front | Batteries stacked in Z direction | Keep all batteries in same horizontal plane |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Horizontal plate holes invisible from top | Countersink on bottom face | Put countersink on top face: `translate([x,y,wall-cs_depth]) cylinder(d1=hole_d, d2=cs_d)` |
| Symptom | Cause | Fix |
|---------|-------|-----|
| Hook looks like separate piece from clip | Used hull-chain of 0.1mm slabs touching at surface | Use single 2D polygon extrusion for entire piece |
| Hook curls away like candy cane | J-curve center at arm tip level, sweeping outward | Place J-curve center below arm tip, sweep clockwise from 90° |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| T-nut looks like a generic stepped block | Tab too tall relative to flange | Keep flange_h : tab_h ratio ~1.5:1 or higher |
| Right side shows plain rectangle, no T-profile | Cross-section is uniform along depth (correct geometry) | Accept this — or make nut nearly square to show T from both sides (but this may look wrong too) |
| Serrations look like rendering artifacts | Features too small at render scale | Don't add anti-rotation serrations — they're invisible/ugly |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Cam looks like a plain circle | Used polar equation for cam profile | Use hull() of two offset cylinders for visible eccentricity |
| Bore appears off-center on symmetric disc | Offset bore instead of offset lobe mass | Keep bore at origin, offset the lobe cylinder center |
| Cam looks like a key/paddle | hull() of very different radius circles | Keep pivot boss and lobe radii within 2:1 ratio |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Organizer looks like a staircase | Used stepped heights for generic "organizer" prompt | Use equal height unless prompt explicitly says "tiered" or "stepped" |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Hex nut edges look sharp despite chamfer code | Chamfer value too small (< 1mm) | Use chamfer >= 2.0mm for render visibility |
| Chamfer visible on top only, bottom sharp | Both cones present but cone steepness hides bottom chamfer | Reduce cone steepness from h*3 to h*1.5 |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Pac-man/wedge missing from lid | Used cutaway difference() to show interior | Never use cutaway — scorer sees missing geometry as damage |
| Square bumps instead of diamond knurl | Used $fn=4 spheres for diamond shape | Low-$fn spheres don't read as diamonds at render scale; use vertical ridges |
| Holes through knurled wall | Crossed angled cubes extend past wall thickness | Keep knurl strictly additive outside skirt radius; reduce knurl_depth |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Knurl looks perforated/has holes | Ridge anchor too shallow (0.5mm) into body | Anchor polygon 2mm+ inside body radius |
| Jagged top/bottom edges on knurl band | Helical ridges terminate at angle | Clip knurl band with cylinder intersection |
| Incomplete diamonds at grip edges | Helical extrusion matches grip height exactly | Over-extrude by 4mm, scale twist proportionally, then clip |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Backrest looks like a flat slab | Back plate too thick (>6mm) | Use wall = 3-4mm for back plate |
| Jagged protrusions on sides | Added triangular gussets for support | Remove gussets — they add visual clutter |
| Back plate extends past base | base_d too small for the angle | Ensure base_d >= back_run + phone_t + wall + 10mm |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| "Three shelves" when you modeled two shelves | Bottom panel counted as a shelf by evaluator | Use N-1 internal dividers for "N shelves" prompt |
| Bookshelf looks like open frame | Missing back panel | Always include back panel for bookshelf recognition |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Teeth look blocky/rectangular | Only 6 polygon points per tooth (trapezoid) | Use 10-point polygon with intermediate radii for curved involute-like flanks |
| Gear looks like a washer/too thin | Gear thickness too small relative to diameter | Make thickness ~0.5x pitch diameter |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Hexagonal/wavy top opening | Opening inherits wavy polygon shape from waves=6 | Add thin circular cylinder rim at top, or increase waves count |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Belly not prominent enough | P1 too conservative (40) with tall height | Increase P1 to 50+ and reduce total height to 140mm for squat proportions |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Flat disc-shaped wings on wing nut | Used polar cosine (N=2) profile | Use hull-of-spheres for upswept fin shape |
| Rectangular slab wings | Used cube-based hull for wings | Use scaled spheres for organic curve |
| Wings look like flat pads | wing_rise too low, wings don't extend above hub | Increase wing_rise to 4-6mm above hub top |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Battery holder looks like solid block | Walls are 100% of battery height | Use 55-65% of item length for wall height |
| Holder looks elongated, not "grid" | Batteries arranged end-to-end in one direction | Keep square footprint — all wells at same Z level |
| Spring contact slots invisible | Slots only in floor, not visible from side views | Add slots through divider walls between wells |
| 2x2 looks like 1x2 from front | Batteries stacked in Z direction | Keep all batteries in same horizontal plane |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Horizontal plate holes invisible from top | Countersink on bottom face | Put countersink on top face: `translate([x,y,wall-cs_depth]) cylinder(d1=hole_d, d2=cs_d)` |
| Symptom | Cause | Fix |
|---------|-------|-----|
| Pin looks like disconnected pieces | Hull segments don't share endpoints | Ensure consecutive segments overlap at shared points |
| Eye looks like U-bend, not a loop | Only 180° arc | Use nearly-full circle (360° - 2*delta) |
| Pin looks too thick/chunky | Wire diameter too large | Use wire_d ≈ 2-3% of total length |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Organizer looks like a staircase | Used stepped heights for generic "organizer" prompt | Use equal height unless prompt explicitly says "tiered" or "stepped" |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Hex nut edges look sharp despite chamfer code | Chamfer value too small (< 1mm) | Use chamfer >= 2.0mm for render visibility |
| Chamfer visible on top only, bottom sharp | Both cones present but cone steepness hides bottom chamfer | Reduce cone steepness from h*3 to h*1.5 |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Pac-man/wedge missing from lid | Used cutaway difference() to show interior | Never use cutaway — scorer sees missing geometry as damage |
| Square bumps instead of diamond knurl | Used $fn=4 spheres for diamond shape | Low-$fn spheres don't read as diamonds at render scale; use vertical ridges |
| Holes through knurled wall | Crossed angled cubes extend past wall thickness | Keep knurl strictly additive outside skirt radius; reduce knurl_depth |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Knurl looks perforated/has holes | Ridge anchor too shallow (0.5mm) into body | Anchor polygon 2mm+ inside body radius |
| Jagged top/bottom edges on knurl band | Helical ridges terminate at angle | Clip knurl band with cylinder intersection |
| Incomplete diamonds at grip edges | Helical extrusion matches grip height exactly | Over-extrude by 4mm, scale twist proportionally, then clip |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Backrest looks like a flat slab | Back plate too thick (>6mm) | Use wall = 3-4mm for back plate |
| Jagged protrusions on sides | Added triangular gussets for support | Remove gussets — they add visual clutter |
| Back plate extends past base | base_d too small for the angle | Ensure base_d >= back_run + phone_t + wall + 10mm |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Coupling looks like pipe fitting | Used raised flange at center | Use subtracted groove (difference with ring) instead |
| Coupling looks like plain cylinder | No clamping slit visible | Add radial slit from bore to surface on each half |
| Slit invisible in renders | Both slits on same side | Place slits on opposite sides for multi-view visibility |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| "Three shelves" when you modeled two shelves | Bottom panel counted as a shelf by evaluator | Use N-1 internal dividers for "N shelves" prompt |
| Bookshelf looks like open frame | Missing back panel | Always include back panel for bookshelf recognition |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Teeth look blocky/rectangular | Only 6 polygon points per tooth (trapezoid) | Use 10-point polygon with intermediate radii for curved involute-like flanks |
| Gear looks like a washer/too thin | Gear thickness too small relative to diameter | Make thickness ~0.5x pitch diameter |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Belly not prominent enough | P1 too conservative (40) with tall height | Increase P1 to 50+ and reduce total height to 140mm for squat proportions |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Battery holder looks like solid block | Walls are 100% of battery height | Use 55-65% of item length for wall height |
| Holder looks elongated, not "grid" | Batteries arranged end-to-end in one direction | Keep square footprint — all wells at same Z level |
| Spring contact slots invisible | Slots only in floor, not visible from side views | Add slots through divider walls between wells |
| 2x2 looks like 1x2 from front | Batteries stacked in Z direction | Keep all batteries in same horizontal plane |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Horizontal plate holes invisible from top | Countersink on bottom face | Put countersink on top face: `translate([x,y,wall-cs_depth]) cylinder(d1=hole_d, d2=cs_d)` |
| Symptom | Cause | Fix |
|---------|-------|-----|
| Cradle looks like a hook, not a U | Cradle centered at arm level, hangs below | Position cradle center ABOVE arm: `arm_top_z + r_outer` |
| 2D profile cradle inverted after rotation | `rotate([0,90,0])` maps 2D X → 3D -Z (not +Z) | Use 3D cylinder difference instead of 2D extrusion |
| Visual Symptom | Root Cause | Fix |
|---|---|---|
| J-hook curves back toward door (wrong side) | Swept angles clockwise (decreasing from 90°) | Sweep counterclockwise (increasing from 90°) |
| Hook forms closed loop, can't hang towel | j_sweep > 200° | Keep j_sweep 150-180° |
| Hook too open, won't retain items | j_sweep < 130° | Use j_sweep >= 150° |
| Right-angle transition from clip to hook | Polygon has sharp corner at junction | Consider hull-chain fillet or separate arc transition polygon |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Backrest looks like a flat slab | Back plate too thick (>6mm) | Use wall = 3-4mm for back plate |
| Jagged protrusions on sides | Added triangular gussets for support | Remove gussets — they add visual clutter |
| Back plate extends past base | base_d too small for the angle | Ensure base_d >= back_run + phone_t + wall + 10mm |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| V-groove looks like rectangular channel | Used single rotate_extrude polygon for profile | Use separate cone primitives for V-walls |
| Two discs with a gap, no V visible | Flanges too thick (>2.5mm) | Reduce flange_t to 1.5mm |
| Groove too shallow to see | groove_bottom_r > 70% of outer_r | Use groove_bottom_r = 55-65% of outer_r |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| "Three shelves" when you modeled two shelves | Bottom panel counted as a shelf by evaluator | Use N-1 internal dividers for "N shelves" prompt |
| Bookshelf looks like open frame | Missing back panel | Always include back panel for bookshelf recognition |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Teeth look blocky/rectangular | Only 6 polygon points per tooth (trapezoid) | Use 10-point polygon with intermediate radii for curved involute-like flanks |
| Gear looks like a washer/too thin | Gear thickness too small relative to diameter | Make thickness ~0.5x pitch diameter |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Belly not prominent enough | P1 too conservative (40) with tall height | Increase P1 to 50+ and reduce total height to 140mm for squat proportions |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Battery holder looks like solid block | Walls are 100% of battery height | Use 55-65% of item length for wall height |
| Holder looks elongated, not "grid" | Batteries arranged end-to-end in one direction | Keep square footprint — all wells at same Z level |
| Spring contact slots invisible | Slots only in floor, not visible from side views | Add slots through divider walls between wells |
| 2x2 looks like 1x2 from front | Batteries stacked in Z direction | Keep all batteries in same horizontal plane |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Horizontal plate holes invisible from top | Countersink on bottom face | Put countersink on top face: `translate([x,y,wall-cs_depth]) cylinder(d1=hole_d, d2=cs_d)` |
| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| Hooks appear disconnected from plate | Arm cylinder starts at plate surface | Extend arm start 1mm behind plate (y = -1) |
| Hooks look stubby/bulbous | Added fillet cone at junction | Remove fillet, use simple cylinder intersection |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Organizer looks like a thick brick | Base height too large (>15mm) | Reduce base_h to 10-15mm for flat appearance |
| Slots make it look like a comb | Slots run full front-to-back | Use cylindrical holes + narrow entry slots from one edge only |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Circular bird feeder looks like a generic plate | Used cylinder for tray base | Use rectangular rbox for more recognizable bird feeder shape |
| Tabs look like small bumps on rim | Tab too narrow (<20mm) or too short | Use tab_w >= 24mm, tab_h >= 20mm with rounded tops |
| Non-manifold warning on tab-rim junction | Tab shares face with rim cylinder wall | Use cube tab that extends full height from z=0, overlapping rim |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Slot looks like a thin slit in solid block | Cut slot into solid body instead of open-frame | Use open-frame: base + angled back plate + front lip + side walls |
| Back plate looks nearly vertical | Angle too steep (>70° from horizontal) | Use 50-60° from horizontal for visible lean |
| Slot looks like a gap, not a channel | No raised floor in slot area | Add 3mm raised shelf floor under slot area |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Orange circles/holes visible on wave body | Explicit cylinder groove cut penetrates wave surface | Don't cut grooves — use wave valley as natural cradle |
| Chopstick rest looks like a pillow | Hull of large overlapping spheres | Use smaller sphere radii with more hull steps |
| Pointed/spiked side profile | Sphere scaling ratio wrong (height >> width at ends) | Ensure wave_h envelope tapers smoothly to near-zero at ends |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Stand looks like a doorstop/ramp | Solid triangular side panels fill the space | Use hull() wedge of two horizontal bars instead |
| Nameplate appears vertical (90°) | Angle parameter inverted: used angle instead of 90-angle | tilt_from_horiz = 90 - angle_from_vertical |
| Floating slivers near side panels | Side supports rotated with complex transforms | Don't add separate side panel supports — use full-width hull wedge |
| Nameplate oriented tall instead of wide | linear_extrude along wrong axis | Use hull() approach or ensure extrude axis matches width dimension |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Label looks trapezoidal from front | Hull with rounded cylinders for corners | Use simple cube for label plate |
| Label looks like thick nub from side | Label thickness > stake thickness | Match label_t to stake_t (2mm) |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Arc top looks like a hook/spiral | Used rotate_extrude for arch | Use hull-chain of spheres along parametric X-Z curve |
| Base doesn't look "weighted" | Base too thin (<15mm) | Use base_h >= 20mm with chamfered edges |
| Compile takes minutes on arc | High $fn on hull spheres | Use $fn=16-24 for hull chain spheres |
| Symptom | Cause | Fix |
|---------|-------|-----|
| Barbs look like smooth cones despite correct sawtooth polygon | OpenSCAD faceting smooths the barb profile visually | Use more polygon points in the ramp section; accept this is a rendering limitation |
| Non-manifold mesh when union of revolved body + hex | Coincident faces between cylinder and hex at shared boundary | Keep hex and revolved barbs as separate bodies, cut bore through union at end |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Handle looks round on a scoop | Used hull-chain spheres for entire shape | Use cube() for flat handle, only sphere for bowl |
| Handle angles upward from bowl | Handle starts from bowl center, not rim | Attach handle at rim level (z=0), not at bowl midpoint |
| Bowl looks solid, not hollow | Sphere not properly hollowed or cut | Use sphere() - smaller sphere(), cut top half with cube |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Riser looks like a solid block | Used hollow-box with thick walls | Use open-shelf: top platform + two side walls, no back panel |
| Cable hole invisible from top | Hole too small or positioned under overhang | Use stadium shape ≥70mm wide, position clearly on top surface |
| Side walls look chunky | Side wall thickness >20mm | Use side_w = 15mm for balanced look |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Cup looks like a drinking cup | Height:diameter ratio too high (>1.2:1) | Keep ratio near 1:1, max 60mm tall |
| Cup looks like a bowl | Height:diameter ratio too low (<0.7:1) | Keep height >= 50mm |
| Cup looks like a tin can | No taper, straight walls | Use bezier with P4 > P0 for slight outward flare |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Grip looks like a mound/dome | Grip too wide and low relative to base | Make grip height 6-7x base thickness, waist rx < 60% of base flare |
| Visible banding/rings on grip shaft | Too few hull segments with large radius changes | Use 5-6 segments with gradual transitions between them |
| Faceted/low-poly grip surface | Used $fn=16 on hull spheres for speed | Must use $fn=120 on hull spheres even though it's slower |
| Mushroom-cap top on handle | Palm swell too wide, dome too small | Keep palm swell < base flare width, dome > 40% of swell |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Scorer always says "too deep/ladle-like" even with shallow bowl | Hull between spheres creates convex bowl silhouette from side | May need entirely different approach (e.g., polygon extrusion or surface lofting) for spoon bowls |
| Scoop oval doesn't match bowl outline from top view | Scoop Y-axis too short relative to bowl length | Use scoop Y-scale = bowl_l * 0.35 to fill most of bowl area |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Star tips are rounded | Used `offset(r = positive)` on cutting edge | Only use positive offset for handle rim, use negative offset for wall hollowing |
| Star barely recognizable | inner_r too close to outer_r | Keep inner_r at ~45% of outer_r for 5-pointed star |
| Cookie cutter looks like solid star | Missing `difference()` with offset interior | Must subtract `offset(r = -wall_t)` version to create thin walls |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Thread looks like horizontal rings | M-thread pitch too fine for render scale (helix angle ~3°) | Fundamental limitation — linear_extrude with twist is the best approach but scorer may plateau at 7 |
| Thread compile takes 10+ minutes | Used hull-chain with 2000+ segments | Use linear_extrude(twist=) instead — instant compile |
| Thread cross-section too deep/shallow | Wrong radius for thread triangle | Use `(major_r - minor_r) / 2` for triangle radius |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Dome comes to a point | Used bezier curve for dome profile | Use `sphere()` primitive instead of polygon approximation |
| Generic-looking round top | No decorative detail on sphere | Add torus rings at latitude lines and finial knob at apex |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Egg cup looks like a goblet | Cup portion too tall/wide relative to stem | Keep cup at ~1/3 of total height, cup_r < base_r * 0.7 |
| Egg cup looks top-heavy | Base radius too close to cup radius | Make base_r at least 1.4x cup_r |
| What You See | What's Wrong | Fix |
|---|---|---|
| Label slot looks like a hole through the wall | Used difference() to cut recess into curved cylinder | Use additive raised frame (cube bars) instead of subtractive recess |
| Frame invisible in orthographic front view | Frame protrusion < 3mm | Use frame_depth >= 4mm for render visibility |
| Slot has curved/trapezoidal shape on cylinder | Rectangular cut intersects cylinder creating curved edges | Use rounded-rectangle cross-section body for flat front face |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Hook curls back toward door | J-curve sweep > 180° wraps past bottom and comes back | Keep j_sweep ≤ 170° |
| Upturn tail looks like disconnected stub | Tail angled relative to curve end creates sharp junction | Use plain vertical rectangle for tail |
| Big C-shape instead of J-hook | Used 200°+ single arc sweep | Reduce to 150-170° sweep + separate tail |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Plate disconnected from stand in side view | Built from separate cubes/hulls | Use single extruded side-profile polygon |
| Text recess invisible (no vertex change) | Wrong rotation sign on cutting cube | Use rotate([+tilt,0,0]) not rotate([-tilt,0,0]) |
| Solid wedge, no visible plate | Profile polygon fills entire wedge area | Trace thin plate front+back faces explicitly in polygon |
| Floating thin frame on plate | Border frame geometry doesn't attach to surface | Don't add thin decorative frames; use engraved recess instead |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Hook tip invisible from side/front | Tail extends in depth axis (2D Y → 3D -X) | Redirect tail to extend in 2D +X (→ 3D +Z = upward) |
| Over-door hook looks blocky/thick | Wall thickness too large for door accessory | Use thick ≤ 2.5mm for slim profile |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Wire pin compiles for 10+ minutes | Hull spheres at $fn=120 | Use $fn=12 for hull spheres on wire objects |
| Pin looks like a tuning fork | Tine splay too extreme | Reduce splay_x to < 1mm, limit to bottom 15% of tine length |
| Loop looks like open hook | Arc doesn't cover full 180° or arc radius too small | Ensure loop sweeps 0-180° with arc_r matching visual expectation |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Swivel pad invisible at screw tip | Pad diameter too close to screw diameter | Make pad_d >= 2.5x screw_d with visible dome |
| Compile takes 10+ minutes on threaded screw | Used rotate_extrude ring grooves for threads | Use linear_extrude with twist — 10x faster |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Port cutouts look like open panels | Case height too close to port height | Make box_h >= 1.5x tallest port cutout |
| Ports invisible from side view | Cut depth too small or misaligned | Use wall+2 depth, start at wall_pos - 0.5 |
| Case looks like generic box, not electronics enclosure | No port differentiation | Use different sizes per port type (ethernet vs USB vs HDMI) |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Spring contacts look like flat tabs | Used zigzag/leaf shape instead of coil | Use hull-chained spheres in helical arrangement for true coil spring |
| Compile takes 5+ minutes on springs | High $fn on hull spheres | Use $fn=12 for hull spheres in coil spring module |
| Non-manifold warning on spring+box union | Spring geometry partially inside wall | Position spring so base plate overlaps wall by 1-2mm |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Head slot invisible from side | Slot too narrow or head too small | Use head_height >= 8mm, slot extends past head faces by 2-3mm |
| Non-manifold teeth | Used polyhedron with coplanar vertices | Use hull() of two thin cubes at different heights |
| Pointed tip looks like a spike | Tapered polygon tip too narrow | Use semicircle intersection for rounded ribbon end |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Dovetail tails look like triangles | tail_narrow too small relative to tail_wide | Keep tail_narrow:tail_wide ratio >= 1:1.8 |
| Male and female pieces different sizes | Female block not extended to match male total Y extent | Add tail_length to female block Y dimension |
| Dovetail features invisible from front | Tails/slots face sideways, not toward camera | Orient so trapezoidal profile visible in top view; features face -Y |
| Orange artifacts inside female slots | Through-slots create visible internal faces | Use blind slots — don't cut all the way through back face |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Finial looks like a simple cone | Used plain cylinder/cone for finial | Use rotate_extrude polygon with urn profile (bulge-neck-bulge-taper) |
| Gap between post and finial | No cap plate transition | Add wider cap plate between post top and collar |
| Finial looks like a tiny bump | Finial height too small relative to post | Make finial 35-40% of post height |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Rounded arch instead of pointed | Using single semicircular arc | Use two crossing arcs with centers at opposite base corners |
| Gap/diamond at arch apex | Inner arch uses different centers than outer | Use same arc centers for inner and outer, just reduce radius |
| One window pane solid/filled | Used intersection() to clip mullion to inner arch | Use simple rectangle union for mullion instead |
| Frame lying flat on ground | Extruded along Z without rotation | Add rotate([90, 0, 0]) before linear_extrude |
| Frame looks like cardboard cutout | Depth too small (<10mm) | Use depth >= 18mm |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Circular openings visible on housing sides | Bore extends past housing ends | Make bore 80-85% of housing length so ends are solid |
| Window looks like shallow recess, no channel visible | Window doesn't cut deep enough to reach bore | Set window bottom to housing_h/2 - vial_d/4 |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Counterbore invisible from top | cb_d too close to base_d, or magnet_h too small | Keep cb_d < 50% of base_d, magnet_h >= 2mm |
| Base looks like a washer | base_h too small relative to base_d | Keep base_h >= base_d * 0.15 |
| Mounting holes overlap counterbore | PCD too small | Ensure PCD/2 > cb_d/2 + hole_d |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Abacus looks like a cross/plus shape from top | Two overlapping cubes (one centered, one not) | Use single cube with explicit translate([-w/2,-w/2,z]) |
| Shaft looks barrel-shaped | Entasis amplitude too high | Keep entasis peak < 1mm |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Tick marks invisible on flat object | Ticks are flush with surface (same height) | Make ticks 1-2mm taller than body thickness |
| Tick marks too thin to see | Width < 0.8mm | Use width >= 1.0mm, 1.5mm for major ticks |
| Very slow compile on graduated scale | Too many text() labels | Limit text to every 30° or remove entirely |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Tunnels instead of arches | Used only cylinder for arch opening | Combine cylinder (semicircle above spring line) + cube (rectangular gap below) |
| Diamond notches at piers from top | Added triangular cutwaters to piers | Don't add cutwaters — they create bad artifacts |
| Small blocky protrusions at arch crowns | Added keystone blocks | Don't add keystones — they read as artifacts at render scale |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Dial invisible from front ortho view | Same-color cylinder protrusion has no edge contrast in ortho | Accept limitation — dial visible in iso view; could try cutting circular recess behind dial |
| Dial goes INTO box instead of out | Used rotate([-90,0,0]) instead of rotate([90,0,0]) | rotate([90,0,0]) maps +Z to -Y (toward front camera) |
| Non-manifold on dial with mirror | mirror() creates coincident faces | Don't mirror dial — use correct rotation directly |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Buckle looks like solid rectangle | No center opening in female frame | Use difference() to cut large rbox opening from frame |
| Non-manifold on buckle with strap bars | Cylinder bar touches frame face exactly | Embed bar 2mm+ into body wall |
| Buckle looks too flat from iso view | body_h too small (<7mm) | Use body_h >= 7mm for visible depth |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Steps look like paddle blades | Used cube() for treads on spiral staircase | Use annular_sector polygon with curved inner/outer edges |
| Staircase looks like an auger | Step thickness < 5mm, treads too thin | Increase step_thickness to 6mm+ |
| Cluttered/messy staircase | Added risers + handrail posts | Keep it simple — column + annular sector treads only |
| Steps merge in top view | step_sweep too close to 360/step_count | Keep step_sweep 10-15° less than 360/step_count |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Toggle clamp looks like a generic bracket | Single-piece flat arm, no visible linkage | Use forked arm + separate toggle links with visible pivot pins |
| Clamping bar invisible from side | Bar is just a flat plate on the base | Add vertical spindle + conical pressing pad above bar |
| Pivot points invisible | Small pin_r with no bosses | Add enlarged pivot bosses (pin_r + 2mm) at each upright |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Lid blocks interior view from iso angle | Hinge at front (negative Y) edge | Hinge at back (positive Y), rotate with negative angle |
| Hinge looks thin/fragile from side view | Multiple small knuckle barrels | Use single full-width barrel cylinder |
| Non-manifold warning on hinged box | Hinge barrel tangent to box wall | Accept warning — doesn't affect visual quality; or offset hinge slightly |
| Lid looks like a thin strip from side | Lid opened too far (>120°) or lid_h too small | Keep open angle 100-115°, lid_h >= 8mm |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Rack looks like a file organizer | Used open-frame dividers instead of solid block | Use solid block with slot cuts via difference() |
| Slots invisible from front/side/top | Side walls same height as back wall, enclosing slots | Keep body low-profile — total height < card height |
| Rack looks like a bookshelf | Tall dividers with open front | Use short body with slots cut from top, not tall dividers |
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Jaw looks like closed oval slot | Used hull of circles for jaw cutout | Use rectangle extending past head tip for open jaw |
| V-shaped jaw instead of U-shape | Polygon with center point converging to centerline | Use flat-bottomed U (two parallel inner edges connected by horizontal segment, not a V) |
| Head looks bulbous/rounded | All hull circles same diameter | Use tapering hull: smaller circle at tip than at base |
| Wrench looks like a fork/pry bar | Head not wide enough relative to handle | Head width should be ~1.8× handle width minimum |

(These already exist in agent-context.md — no new failures discovered.)
No new visual failures discovered — the existing technique worked well on first attempt.
None discovered — the proven template worked on first attempt.
No new visual failures discovered — the existing technique worked well on first attempt.
No new visual failures discovered — the existing technique worked well on first attempt.
None — this is a straightforward CSG operation with no common failure modes beyond the standard bore-extension rule.
None discovered — the proven template worked on first attempt.

---

## 3. How to Iterate

### When to refine (score 4-7):
- Identify the SINGLE biggest issue
- Change ONLY what's needed to fix that issue
- Keep everything that's working

### When to start over (score < 4):
- The fundamental approach is wrong (e.g., used CSG when should use revolution)
- Reclassify the object and pick a different technique

### When to accept (score 8+):
- Silhouette matches the description
- Proportions look right
- Curves are smooth
- It would be recognizable to someone who hasn't read the description

### Key rule: If a refinement makes things worse, REVERT to the best version. Never build on a regression.

### Reference accuracy matters
Don't guess where features go — think about what the real object looks like. Examples:
- Chess rook decorative ring → lower third of shaft, just above base (NOT mid-shaft)
- Cup handle → attached at upper third and lower third of body
- Bottle label area → middle third of body
- Vase neck → upper quarter, not middle

When placing decorative features, ask: "Where would this be on the real object?"

---

## 4. Learned Techniques

These are general techniques discovered through iteration. Each applies to many objects.

---

### Technique: Bezier Profile Revolution
Keywords: vase, cup, mug, bottle, bowl, goblet, pot, jar, chalice, wine glass, planter, urn, bell, lamp shade, candle holder, chess, trophy, pedestal, column, pillar, baluster, candlestick, vessel, drinking

**When to use:** Any rotationally symmetric object — vases, cups, bottles, bowls, goblets, lampshades, planters, urns, chess pieces, candle holders, pots, jars, bells, wine glasses, columns, balusters

**What it is:** `rotate_extrude()` with a polygon whose radius follows a bezier curve.

**Why it beats alternatives:**
- Hand-placed points → bumpy (humans can't interpolate smooth curves across 20+ points)
- Gaussian functions → jarring bulges with sudden transitions
- Cubic bezier (3 points) → too subtle, everything looks like a tube
- **4th-degree bezier (5 points) → smooth, controllable, just right**

**The formula:**
```
r(t) = (1-t)⁴·P0 + 4·(1-t)³·t·P1 + 6·(1-t)²·t²·P2 + 4·(1-t)·t³·P3 + t⁴·P4
```

**The 5 knobs:**
- **P0** = width above foot (starting radius)
- **P1** = lower body (↑ = belly, ↓ = straight)
- **P2** = mid body (overall girth)
- **P3** = upper body (↓ = neck, ↑ = straight)
- **P4** = rim width (opening size)

**How to "dial in" different shapes with the same code:**
| Shape | P0 | P1 | P2 | P3 | P4 | Why |
|-------|----|----|----|----|-----|-----|
| Classic vase | 15 | 40 | 27 | 15 | 31 | Big belly, narrow neck, flared rim |
| Tall bottle | 18 | 20 | 18 | 10 | 8 | Straight body, very narrow neck |
| Wide bowl | 30 | 35 | 30 | 28 | 32 | Shallow, wide, open |
| Goblet | 8 | 10 | 12 | 8 | 22 | Thin stem, wide cup on top |
| Bell | 5 | 30 | 35 | 38 | 40 | Narrow top, flares down |
| Chalice | 10 | 12 | 10 | 8 | 25 | Thin stem, wide bowl |
| Planter | 20 | 28 | 30 | 30 | 32 | Slightly tapered, wide open |

**Proven code template:**
```openscad
$fn = 120;
rotate_extrude() {
    polygon(points = concat(
        [[0, 0]],
        // Foot (explicit points, NOT bezier)
        [[20, 0], [21, 2], [20.5, 4], [19, 6], [17, 9], [15.5, 12]],
        // Body (bezier curve)
        [for (z = [12 : 1 : 165])
            let(
                t = (z - 12) / 153,
                r = (1-t)*(1-t)*(1-t)*(1-t) * P0
                  + 4*(1-t)*(1-t)*(1-t)*t * P1
                  + 6*(1-t)*(1-t)*t*t * P2
                  + 4*(1-t)*t*t*t * P3
                  + t*t*t*t * P4
            )
            [r, z]
        ],
        // Rim
        [[R, 166], [R+0.5, 168], [R-1, 169], [R-3, 169.5], [R-4, 169]],
        // Inner wall (outer - wall_thickness)
        [for (z = [165 : -1 : 12])
            let(
                t = (z - 12) / 153,
                r_outer = /* same formula */,
                r = max(3, r_outer - 2.5)
            )
            [r, z]
        ],
        // Inner foot
        [[12.5, 12], [14, 9], [16, 6], [17.5, 4], [18, 2], [17, 1], [0, 1]]
    ));
}
```

**Pitfalls:**
- Hand-placed polygon points (>6-8) → bumpy
- Gaussian exp() → jarring bulges
- Cubic bezier (3 points) → too subtle, looks like a tube
- Flat disc base → looks like pedestal (always add foot)
- Missing inner wall → solid block
- $fn < 80 → visible facets
- Wall < 2mm → not printable

**Discovered:** Vase session, 10 iterations. Hand-placed → Gaussian → cubic bezier → 4th-degree bezier.

---

### Technique: Foot and Base Design
Keywords: vase, cup, bowl, goblet, trophy, pedestal, planter, urn, pot, jar, candle holder, lamp, stand, base, foot

**When to use:** Any object that sits on a surface.

**Rule:** Never start a curved profile from z=0. Always add a separate foot section.

**Why:** Bezier curves start with zero slope at t=0, creating a flat disc. A separate foot section gives visual weight and a proper base.

**Pattern:**
```openscad
// Foot: 4-6 explicit points
[[base_r, 0], [base_r+1, 2], [base_r+0.5, 4], [base_r-1, 6], [base_r-3, 9], [body_start_r, foot_height]]

// Optional decorative ring at transition
..., [r-3, 8], [r-2, 10], [r-3, 11], ...  // subtle bump
```

**Rules:**
- Foot width = 60-70% of widest body point
- Foot height = 5-10% of total height
- Must be > 40% of max width for stability

**Discovered:** Vase iterations 0-2 (flat disc) vs 7+ (proper foot).

---

### Technique: Smooth Curves via Math
Keywords: curve, smooth, profile, sweep, wave, undulating, organic, rounded

**When to use:** Any profile needing smooth curves — not just revolutions.

**Core pattern:**
```openscad
[for (i = [0 : step : max])
    let(t = i / max, r = curve_function(t))
    [r, i]
]
```

**Curve types:**
- **Bezier** — best for controlled profiles
- **Sine** — undulating surfaces: `base + amp * sin(t * 360 * freq)`
- **Smoothstep** — transitions: `t*t*(3-2*t)`

**Rules:**
- Step 1-2mm for smooth results
- Use `max()` to enforce minimums (wall thickness)
- `concat()` to join segments: foot + body + rim + inner wall

**Discovered:** Vase iteration, comparing approaches.

---

### Technique: CSG Detail Cutting
Keywords: crenellation, gear, teeth, fluted, perforation, slot, spoke, vent, keyhole, rook, battlement, merlon

**When to use:** Any object with repeating geometric features around a body — crenellations, gear teeth, fluted columns, decorative perforations, ventilation slots, spoke patterns, keyhole slots.

**What it is:** Build the main body as a solid, then use `difference()` to cut repeating geometric shapes out of it. The cuts are placed with `for()` + `rotate()`.

**Why it beats adding geometry:** Cutting is cleaner than adding — no overlap artifacts, no alignment issues. The body stays manifold and watertight.

**Pattern for radial cuts (e.g., crenellations, gear teeth):**
```openscad
module radial_cuts() {
    count = 5;
    angle = 27;       // angular width of each cut
    cut_height = 10;

    for (i = [0 : count - 1]) {
        rotate([0, 0, i * 360 / count])
            translate([0, 0, top_z - cut_height])
                linear_extrude(height = cut_height + 1)  // +1 to fully cut through
                    polygon(points = [
                        [0, 0],
                        [r_max * cos(-angle/2), r_max * sin(-angle/2)],
                        [r_max * cos(angle/2), r_max * sin(angle/2)],
                    ]);
    }
}

difference() {
    main_body();
    radial_cuts();
}
```

**Tuning the look:**
| Parameter | Effect |
|-----------|--------|
| `count` | Number of cuts (5 for rook, 20+ for gear) |
| `angle` | Width of gap — smaller = wider teeth/merlons |
| `cut_height` | How deep the cuts go |
| `r_max` | Must exceed body radius to cut fully through |

**Pitfalls:**
- Cuts must extend PAST the body surface — use `r_max` larger than body radius
- Add +1 to cut height to avoid z-fighting at the surface
- Pie-slice polygon must start at [0,0] to create a proper wedge
- Using `cube()` for cuts on round bodies leaves square corners — pie-slice `polygon` follows the curve

**Discovered:** Rook iteration 1-2. Cubes on top (iter 1) looked bad; pie-slice cuts from cylinder (iter 2+) looked correct.

---

### Technique: Hybrid Revolution + CSG
Keywords: chess, rook, bishop, pawn, knight, finial, ornate column, decorative, cutout, gear shaft

**When to use:** Objects that are mostly rotationally symmetric but have geometric details — chess pieces, ornate columns, decorative vessels with cutouts, gear-topped shafts, finials.

**What it is:** Combine bezier profile revolution for the smooth body with CSG operations (difference, union) for geometric details. Neither technique alone works — smooth curves can't make sharp geometric features, and pure CSG can't make smooth tapered profiles.

**Decomposition pattern:**
1. **Body** → `rotate_extrude()` with bezier polygon (smooth shape)
2. **Geometric features** → CSG cuts or additions placed with `rotate()` + `translate()`
3. **Assembly** → `difference()` or `union()` to combine

**Architecture:**
```openscad
module body() {
    rotate_extrude() { polygon(...); }  // bezier profile
}

module detail_cuts() {
    for (...) { ... }  // geometric features
}

module detail_additions() {
    for (...) { ... }  // added features
}

difference() {
    union() {
        body();
        detail_additions();
    }
    detail_cuts();
}
```

**Decorative ring technique (mid-shaft detail):**
```openscad
// In the polygon profile, interrupt the bezier with explicit points:
// ... bezier points up to z=24 ...
[[r, 24], [r+0.5, 25.5], [r+0.7, 27], [r+0.5, 28.5], [r, 30]],
// ... resume bezier from z=30 ...
```
This creates a subtle raised ring without needing a separate CSG operation.

**When to use each sub-technique:**
| Feature | Approach |
|---------|----------|
| Smooth tapered body | Bezier revolution |
| Crenellations / notches | CSG pie-slice cuts |
| Rings / bands | Polygon point bumps in profile |
| Stepped base | Explicit polygon points |
| Collar / flare | Explicit polygon points between bezier sections |

**Pitfalls:**
- Don't try to model geometric details (teeth, notches) with the revolution profile — use CSG
- Don't try to model smooth curves with CSG primitives — use revolution
- Keep the body and detail modules separate for easier debugging
- Test the body alone before adding cuts

**Discovered:** Rook session, 6 iterations. Pure revolution couldn't make crenellations; pure CSG couldn't make the smooth tapered shaft. Combining both was the breakthrough.

---

### Technique: Radial Tooth Addition
Keywords: gear, spur gear, cog, sprocket, pinion, wheel, toothed, timing pulley, ratchet

**When to use:** Any object with teeth or projections radiating outward from a central disc — spur gears, cogs, sprockets, ratchets, timing pulleys, star knobs.

**What it is:** Build a base disc at root radius, then `union()` individual tooth polygons placed with `rotate()` + `linear_extrude()`. Each tooth is a trapezoid (wider at root, narrower at tip) approximating an involute profile.

**Why it beats cutting:** Cutting gaps from a full circle removes the center when gaps overlap. Adding teeth to a disc guarantees the body stays solid. The disc defines the "valley" between teeth; teeth define the "peaks."

**Standard gear parameters:**
```
pitch_r = teeth * module_val / 2
outer_r = pitch_r + module_val           (addendum)
root_r = pitch_r - 1.25 * module_val    (dedendum)
tooth_angle = 360 / teeth
```

**Proven code template:**
```openscad
$fn = 120;
teeth = 20;
module_val = 2.5;

pitch_r = teeth * module_val / 2;
outer_r = pitch_r + module_val;
root_r = pitch_r - 1.25 * module_val;
gear_thickness = 10;
bore_d = 10;
tooth_angle = 360 / teeth;

module single_tooth() {
    tip_half = tooth_angle * 0.18;
    root_half = tooth_angle * 0.30;
    pitch_half = tooth_angle * 0.25;

    linear_extrude(height = gear_thickness)
        polygon(points = [
            [root_r * cos(-root_half), root_r * sin(-root_half)],
            [pitch_r * cos(-pitch_half), pitch_r * sin(-pitch_half)],
            [outer_r * cos(-tip_half), outer_r * sin(-tip_half)],
            [outer_r * cos(tip_half), outer_r * sin(tip_half)],
            [pitch_r * cos(pitch_half), pitch_r * sin(pitch_half)],
            [root_r * cos(root_half), root_r * sin(root_half)],
        ]);
}

module gear() {
    difference() {
        union() {
            cylinder(h = gear_thickness, r = root_r);
            for (i = [0 : teeth - 1])
                rotate([0, 0, i * tooth_angle])
                    single_tooth();
        }
        translate([0, 0, -1])
            cylinder(h = gear_thickness + 2, d = bore_d);
    }
}

gear();
```

**Tuning the look:**
| Parameter | Effect |
|-----------|--------|
| `teeth` | Number of teeth (8 = chunky, 40 = fine) |
| `module_val` | Tooth size — larger = bigger teeth |
| `tip_half` | Tooth tip width — smaller = pointier |
| `root_half` | Tooth base width — larger = wider teeth |
| `gear_thickness` | Extrusion height |
| `bore_d` | Center hole diameter |

**Optional additions:**
- **Hub**: `cylinder(h = hub_height, d = hub_d)` on top for shaft mounting
- **Keyway**: `cube()` cut from bore for keyed shafts
- **Spokes**: Use `difference()` to cut holes in disc for weight reduction
- **Chamfer**: `cylinder(h=1, r1=outer_r, r2=outer_r-1)` on top/bottom edges

**Pitfalls:**
- Never cut gaps from a full circle — overlapping cuts destroy the center
- Tooth polygon must use 6 points (root-pitch-tip-tip-pitch-root) for proper involute approximation
- 4-point trapezoid (root-tip-tip-root) works but looks too blocky
- `tooth_angle * 0.18` for tip, `* 0.30` for root gives good proportions for 20-tooth gears
- For fewer teeth (<12), increase tip_half ratio to avoid overly pointy teeth
- Bore must extend past gear (h + 2, z = -1) to avoid z-fighting

**Discovered:** Gear session, 3 iterations. Cutting approach (iter 1) left floating teeth — overlapping pie-slice cuts removed the disc center. Additive approach (iter 2) immediately worked. Refined with 6-point involute-approximated polygon and hub (iter 3).

---

### Technique: Hex Prism Chamfer via Cone Intersection
Keywords: hex nut, hexagonal, bolt head, hex standoff, hex spacer, hex cap, wrench flat, nut, fastener, hex bar, hex rod

**When to use:** Any hexagonal prismatic object that needs chamfered/beveled edges — hex nuts, bolt heads, hex standoffs, hex spacers, hex bar stock.

**What it is:** `intersection()` of a hex prism (`$fn=6`) with two steep opposing cones. The cones clip the hex corners at top and bottom, creating the characteristic chamfer of real hex fasteners.

**Why intersection beats difference:** Cutting chamfers with `difference()` on a hex body requires complex cone/cylinder math and often over-cuts. The intersection approach naturally clips only what extends beyond the cone — clean, predictable geometry.

**The critical insight — steep cones:**
```
// WRONG: shallow cones → barrel/waist at mid-height
cylinder(h = h, r1 = ar/2 - chamfer, r2 = ar);      // too shallow

// RIGHT: steep cones → only clip top/bottom edges
cylinder(h = h, r1 = ar/2 - chamfer, r2 = ar/2 + h*3);  // steep
```
The cone must reach well past `ar/2` by mid-height so the hex corners aren't clipped in the middle.

**Proven code template:**
```openscad
$fn = 120;
af = 17;               // across flats (wrench size)
ar = af / cos(30);     // across corners
nut_h = 8;
hole_d = 10;
chamfer = 0.8;
inner_chamfer = 0.5;

module hexnut() {
    difference() {
        intersection() {
            cylinder(h = nut_h, d = ar, $fn = 6);
            cylinder(h = nut_h, r1 = ar/2 - chamfer, r2 = ar/2 + nut_h * 3);
            cylinder(h = nut_h, r1 = ar/2 + nut_h * 3, r2 = ar/2 - chamfer);
        }
        // Bore
        translate([0, 0, -1])
            cylinder(h = nut_h + 2, d = hole_d);
        // Inner chamfer top
        translate([0, 0, nut_h - inner_chamfer])
            cylinder(h = inner_chamfer + 1, d1 = hole_d, d2 = hole_d + inner_chamfer * 3);
        // Inner chamfer bottom
        translate([0, 0, -1])
            cylinder(h = inner_chamfer + 1, d1 = hole_d + inner_chamfer * 3, d2 = hole_d);
    }
}
```

**Standard hex nut proportions:**
| Size | af (mm) | nut_h (mm) | hole_d (mm) |
|------|---------|-----------|-------------|
| M6   | 10      | 5         | 6           |
| M8   | 13      | 6.5       | 8           |
| M10  | 17      | 8         | 10          |
| M12  | 19      | 10        | 12          |

**Pitfalls:**
- Shallow cones (r2 = ar) → barrel/waist shape at mid-height. Use r2 = ar/2 + h*3 or steeper
- `ar = af / cos(30)` not `af * 2` — the across-corners to across-flats relationship is geometric
- Chamfer > 1.2mm on M10 nut looks over-chamfered — keep it 0.5-1.0mm
- Inner bore chamfers use d1/d2 cone, not intersection — they're circular, not hexagonal
- `$fn = 6` on the hex prism, `$fn = 120` on everything else (bore, cones)

**Discovered:** Hex nut session, 4 iterations. difference() approach (iter 0) → barrel from front. intersection with shallow cones (iter 1-2) → still barrel. Steep cones with r2 = ar/2 + h*3 (iter 3) → clean chamfer, no barrel.

---

### Technique: CSG Bracket Assembly
Keywords: bracket, mount, shelf bracket, L-bracket, T-bracket, angle bracket, corner bracket, wall mount, support, brace, standoff

**When to use:** Any flat-plate structural object where plates meet at angles — shelf brackets, wall mounts, corner braces, T-supports, equipment mounts, standoffs, angle iron, baseplate assemblies.

**What it is:** `union()` of flat plates (cubes) + structural gussets + countersunk screw holes, all via CSG operations. No curves needed — pure primitives and booleans.

**Decomposition pattern:**
1. **Plates** — cubes for each flat surface (wall plate, shelf plate, base plate)
2. **Gussets** — triangular ribs connecting plates for structural support
3. **Screw holes** — countersunk cylinders subtracted via `difference()`
4. **Corner reinforcement** — cylinder along inner junction (optional)
5. **Chamfers** — extruded polygons subtracted from outer edges (optional)

**The gusset rotation trick (critical):**
`linear_extrude()` always extrudes along Z. To get a gusset in the YZ plane (connecting vertical and horizontal plates), use:
```openscad
rotate([90, 0, 90])  // maps XY polygon → YZ plane, extrudes along X
    linear_extrude(height = gusset_thickness)
        polygon(...)
```

**Curved gusset (more elegant than straight diagonal):**
```openscad
module curved_gusset_rib() {
    translate([0, wall, wall])
        rotate([90, 0, 90])
            linear_extrude(height = gusset_t)
                difference() {
                    square([gusset_d, gusset_h]);
                    translate([gusset_d, gusset_h])
                        circle(r = min(gusset_d, gusset_h) * 0.85);
                }
}
```

**Countersunk screw hole:**
```openscad
module countersunk_hole() {
    translate([0, 0, -1])
        cylinder(h = wall + 2, d = hole_d);         // through-hole
    translate([0, 0, -0.01])
        cylinder(h = cs_depth, d1 = cs_d, d2 = hole_d);  // countersink
}
```

**Proven full template (L-bracket):**
```openscad
$fn = 120;
bracket_width = 80;
bracket_depth = 60;
bracket_height = 80;
wall = 4;
hole_d = 4.5;
gusset_t = 3.5;
gusset_d = (bracket_depth - wall) * 0.4;
gusset_h = (bracket_height - wall) * 0.4;

module bracket() {
    difference() {
        union() {
            cube([bracket_width, wall, bracket_height]);           // vertical plate
            cube([bracket_width, bracket_depth, wall]);            // horizontal plate
            // Curved gusset ribs at 20% and 80% of width
            translate([bracket_width * 0.2, wall, wall])
                rotate([90, 0, 90])
                    linear_extrude(height = gusset_t)
                        difference() {
                            square([gusset_d, gusset_h]);
                            translate([gusset_d, gusset_h])
                                circle(r = min(gusset_d, gusset_h) * 0.85);
                        }
            // Corner reinforcement cylinder
            translate([0, wall, wall])
                rotate([0, 90, 0])
                    cylinder(h = bracket_width, d = wall * 1.5);
        }
        // Countersunk holes on vertical plate
        // Countersunk holes on horizontal plate (clear of gusset zone!)
    }
}
```

**How to adapt for different bracket types:**
| Type | Plates | Gusset Placement |
|------|--------|-----------------|
| L-bracket | vertical + horizontal at bottom | Below junction |
| T-bracket | wall + shelf at mid-height | Below shelf |
| Corner bracket | two plates at 90° | Inside corner |
| Base mount | base + vertical riser | Both sides of riser |

**Sizing rules:**
- Gusset length: ~40-50% of arm length (too large → solid block, too small → weak)
- Gusset thickness: 3-4mm (thinner → weak, thicker → heavy)
- Plate thickness: 3-5mm for 3D printing
- Screw hole inset: ≥ 12mm from edges
- Countersink depth: ~1.5mm, diameter ~2x hole diameter
- Place gussets at 20% and 80% of width (or evenly for 3+)

**Pitfalls:**
- `linear_extrude` goes along Z — gussets in wrong plane without `rotate([90, 0, 90])`
- Gussets too large (>50% of arm) → looks like a solid block, not a bracket
- Screw holes intersecting gussets → thin walls that break. Clear holes from gusset zones
- Countersink on wrong face — must face outward (where screw head sits)
- Edge chamfers are verbose — each edge needs its own positioned/rotated extrusion

**Discovered:** Bracket session, 6 iterations. Gusset orientation was the critical discovery (iter 0-1). Curved gussets (iter 5) looked significantly more professional than straight diagonal. Verified generalizes to T-bracket variant.

---

### Technique: Box/Enclosure Assembly
Keywords: box, enclosure, case, housing, container, shell, lid, cover, snap-fit, electronics enclosure, project box, battery box, junction box, compartment

**When to use:** Any hollow rectangular container with a removable lid — project boxes, electronics enclosures, battery compartments, storage containers, junction boxes.

**What it is:** Pure CSG construction using `hull()` corner cylinders for rounded rectangles + `difference()` for hollowing. Box and lid are separate modules displayed side-by-side. A lip on the lid nests inside the box walls for alignment.

**Rounded rectangle helper (reuse everywhere):**
```openscad
module rrect(w, d, h, r) {
    hull() {
        for (x = [-(w/2 - r), w/2 - r])
            for (y = [-(d/2 - r), d/2 - r])
                translate([x, y, 0])
                    cylinder(r=r, h=h);
    }
}
```

**Proven code template:**
```openscad
$fn = 120;
outer_w = 60;  outer_d = 40;  box_h = 25;
wall = 2.5;  bottom = 2;  corner_r = 3;
lid_top = 3;  lip_h = 5;  lip_wall = 1.5;  lip_gap = 0.3;
screw_post_d = 7;  screw_hole_d = 2.5;

module box() {
    post_h = box_h - bottom;
    difference() {
        union() {
            difference() {
                rrect(outer_w, outer_d, box_h, corner_r);
                translate([0, 0, bottom])
                    rrect(outer_w - 2*wall, outer_d - 2*wall, box_h, corner_r);
            }
            for (x = [-(outer_w/2 - wall - screw_post_d/2), outer_w/2 - wall - screw_post_d/2])
                for (y = [-(outer_d/2 - wall - screw_post_d/2), outer_d/2 - wall - screw_post_d/2])
                    translate([x, y, bottom])
                        cylinder(d=screw_post_d, h=post_h);
        }
        for (x = [-(outer_w/2 - wall - screw_post_d/2), outer_w/2 - wall - screw_post_d/2])
            for (y = [-(outer_d/2 - wall - screw_post_d/2), outer_d/2 - wall - screw_post_d/2])
                translate([x, y, -1])
                    cylinder(d=screw_hole_d, h=box_h + 2);
    }
}

module lid() {
    rrect(outer_w, outer_d, lid_top, corner_r);
    translate([0, 0, lid_top])
        difference() {
            rrect(outer_w - 2*wall - lip_gap, outer_d - 2*wall - lip_gap, lip_h, corner_r);
            translate([0, 0, -1])
                rrect(outer_w - 2*wall - lip_gap - 2*lip_wall, outer_d - 2*wall - lip_gap - 2*lip_wall, lip_h + 2, corner_r);
        }
}

translate([-(outer_w/2 + 5), 0, 0]) box();
translate([outer_w/2 + 5, 0, 0]) lid();
```

**Design rules:**
| Parameter | Guideline |
|-----------|-----------|
| `wall` | 2-3mm for FDM printing |
| `lip_gap` | 0.2-0.4mm clearance for press fit |
| `lip_h` | 4-6mm for secure nesting |
| `lip_wall` | 1-2mm (thinner than box wall) |
| `corner_r` | 2-4mm rounded, 0 for sharp |
| `screw_post_d` | 2-3x screw hole diameter |

**Optional additions:**
- **Ventilation slots**: `for()` + `cube()` cuts in side walls
- **Cable cutout**: `cylinder()` cut in one wall
- **PCB standoffs**: Short cylinders on bottom interior
- **Label recess**: Shallow `rrect()` cut in lid top

**Pitfalls:**
- Hollow cut must extend past box top to create open top
- Screw posts start at `bottom` height, not z=0 — otherwise they poke through the floor
- Lip must be hollow (not solid) — solid lip wastes material
- `lip_gap` too small = won't fit; too large = loose
- Display box and lid side-by-side — stacked hides the interior
- Show lid in correct orientation (lip facing down) — lip facing up looks like a handle
- `minkowski()` for rounded corners is slow — `hull()` with 4 corner cylinders is much faster

**Discovered:** Box session, 3 iterations. Switched from `minkowski()` to `hull()` corners (faster, easier dimension control). Lip proportions and screw post placement are the critical details.

---

### Technique: Hull Chain Composition
Keywords: spoon, scoop, ladle, spatula, paddle, trowel, ergonomic, organic, handle, grip, utensil, serving spoon, ice cream scoop

**When to use:** Any object with organic/freeform shapes that aren't rotationally symmetric — spoons, scoops, ladles, spatulas, paddles, ergonomic grips, trowels, serving utensils.

**What it is:** Build the entire solid as one continuous chain of `hull()` operations between scaled `sphere(r=1)`s. Each sphere defines an ellipsoid cross-section at a point along the spine. The bowl and handle are NOT separate modules — they're sections of the same chain. Then `difference()` carves the scoop from above.

**Why it works:** OpenSCAD has no NURBS or freeform surfaces, but `hull()` between spheres creates smooth organic transitions. By chaining 5+ hull segments from bowl front through handle end, you get a flowing shape with no seams.

**Architecture:**
```
1. Build entire solid as one continuous hull chain (bowl + handle = one piece)
2. Bowl sections use wide, flat ellipsoids; handle sections use rounder ones
3. difference() with ellipsoid from ABOVE to carve scoop
4. difference() with cube to flatten bottom at z=0
```

**Proven code template:**
```openscad
$fn = 120;
bowl_w = 42;  bowl_l = 48;  bowl_depth = 10;  bowl_wall = 2.5;
handle_l = 65;

module spoon_solid() {
    // Section A: front of bowl
    hull() {
        translate([0, -bowl_l*0.3, 5])
            scale([bowl_w*0.4, 10, bowl_depth*0.7]) sphere(r=1);
        translate([0, 0, 5])
            scale([bowl_w/2, 12, bowl_depth]) sphere(r=1);
    }
    // Section B: bowl center to back
    hull() {
        translate([0, 0, 5])
            scale([bowl_w/2, 12, bowl_depth]) sphere(r=1);
        translate([0, bowl_l*0.35, 5])
            scale([bowl_w*0.35, 10, 8]) sphere(r=1);
    }
    // Section C: bowl back to handle start
    hull() {
        translate([0, bowl_l*0.35, 5])
            scale([bowl_w*0.35, 10, 8]) sphere(r=1);
        translate([0, bowl_l*0.6, 4.5])
            scale([6, 7, 5]) sphere(r=1);
    }
    // Section D: handle mid
    hull() {
        translate([0, bowl_l*0.6, 4.5])
            scale([6, 7, 5]) sphere(r=1);
        translate([0, bowl_l*0.6 + 30, 4])
            scale([4.5, 6, 4]) sphere(r=1);
    }
    // Section E: handle end
    hull() {
        translate([0, bowl_l*0.6 + 30, 4])
            scale([4.5, 6, 4]) sphere(r=1);
        translate([0, bowl_l*0.6 + handle_l, 4])
            scale([4, 6, 3.5]) sphere(r=1);
    }
}

module spoon() {
    difference() {
        spoon_solid();
        // Scoop from above — short Y so it stays in bowl area
        translate([0, -3, bowl_depth + bowl_wall - 1])
            scale([(bowl_w-2*bowl_wall)/2, bowl_l*0.28, bowl_depth-bowl_wall])
                sphere(r=1);
        // Flatten bottom
        translate([0, 0, -50]) cube([300, 300, 100], center=true);
    }
}
spoon();
```

**Key principles:**
| Principle | Why |
|-----------|-----|
| One continuous hull chain (no separate bowl/handle) | Prevents seams and bumps at junction |
| `scale()` on `sphere(r=1)` | Creates ellipsoid cross-sections — control width, length, height independently |
| 5+ hull segments total | Bowl needs 2-3, handle needs 2-3 for smooth flow |
| Adjacent segments share an endpoint | Ensures continuity — no gaps |
| Scoop from above with short Y-axis | Keeps scoop in bowl area, doesn't cut into handle |
| Handle Z-scale close to X-scale | Nearly-round cross-section looks thick from side view |
| Minimal taper ratio (>60% of widest) | Prevents needle-thin handle ends |

**Adapting for different objects:**
| Object | Bowl | Handle | Notes |
|--------|------|--------|-------|
| Tablespoon | Round, shallow | Long, flat | Default template |
| Ladle | Deep, round | Long, round cross-section | Increase `bowl_depth`, use circular handle sections |
| Spatula | None | Wide, flat, flared end | Skip bowl, hull to wide flat end |
| Ice cream scoop | Deep hemisphere | Short, thick | `sphere()` for bowl, stubby handle |
| Trowel | Flat, pointed | Short, round | Pointed ellipsoid, thick grip |

**Pitfalls:**
- Separate bowl + handle modules = visible seam. Use one continuous hull chain instead.
- Full sphere for bowl = ring shape when scooped. Use hull chain with flat ellipsoids for bowl sections.
- Handle Z-scale too small = blade-thin from side view. Make Z-scale close to X-scale for roundness.
- Handle taper too aggressive = needle tip. Keep end width > 60% of start width.
- Scoop Y-axis too long = cuts into handle transition, creates notch. Keep scoop Y at ~0.28 * bowl_l.
- Clipping scoop with `intersection() + cube()` = ugly straight edges. Use a shorter ellipsoid instead.
- Bottom not flattened = object rolls. Always cut flat with a cube at z=0.
- Too few hull segments (1-2) = angular transitions. Use 5+ for the whole spoon.

**Discovered:** Spoon session, 12 iterations. Key breakthroughs: (1) continuous hull chain instead of separate bowl+handle (iter 9), (2) scoop from above with short Y-axis (iter 12), (3) round handle cross-sections not flat ellipsoids (iter 8). Failed approaches: separate bowl module with handle overlap (seam), intersection+cube to clip scoop (straight edges), flat ellipsoid handles (blade-thin from side).

---

### Technique: Angled Cradle Assembly
Keywords: phone stand, tablet stand, phone holder, phone dock, phone cradle, tablet holder, book stand, display stand, easel, dock, cradle, holder, kickstand, recipe holder, picture frame stand

**When to use:** Any stand/holder that holds a flat device at an angle — phone docks, tablet stands, easels, book holders, display cradles.

**What it is:** Rounded base + angled back plate + shelf + front lip + side arms with inward grip tabs. Pure CSG with `cube()` primitives, `rotate()` for the angle, and `hull()` for the rounded base.

**Two variants:**
- **Simple lean stand**: base + angled back + lip (for books, frames — device leans)
- **Cradle with grips**: adds side arms with inward tabs (for phones, tablets — device is held securely)

**Key geometry:**
```
back_rise = back_h * sin(angle)
back_run = back_h * cos(angle)
shelf_y = base_d/2 - back_run - phone_t - wall   // where shelf starts
```

**Proven code template (cradle with grips):**
```openscad
$fn = 120;
phone_w = 75;  phone_t = 10;  grip = 6;
base_w = phone_w + 24;  base_d = 50;  base_h = 5;
angle = 70;  back_h = 50;  arm_h = 30;  wall = 5;
corner_r = 4;

back_rise = back_h * sin(angle);
back_run = back_h * cos(angle);

module rrect(w, d, h, r) {
    hull() {
        for (x = [-w/2+r, w/2-r])
            for (y = [-d/2+r, d/2-r])
                translate([x, y, 0]) cylinder(r=r, h=h);
    }
}

module phone_holder() {
    shelf_y = base_d/2 - back_run - phone_t - wall;
    // Rounded base
    rrect(base_w, base_d, base_h, corner_r);
    // Back support — angled
    translate([-phone_w/2 - wall/2, base_d/2 - wall, base_h])
        rotate([90 - angle, 0, 0])
            cube([phone_w + wall, back_h, wall]);
    // Shelf
    translate([-phone_w/2 - wall/2, shelf_y, base_h])
        cube([phone_w + wall, phone_t + wall + back_run, wall]);
    // Front lip
    translate([-phone_w/2 + 5, shelf_y, base_h])
        cube([phone_w - 10, wall, arm_h * 0.35]);
    // Side arms with inward grip tabs
    for (side = [-1, 1]) {
        x_out = side * (phone_w/2 + wall/2);
        translate([x_out - wall/2, shelf_y, base_h])
            cube([wall, phone_t + wall, arm_h]);
        grip_x = side == -1 ? x_out + wall/2 : x_out - wall/2 - grip + wall;
        translate([grip_x, shelf_y + wall, base_h + wall])
            cube([grip, phone_t, arm_h - wall*2]);
    }
}
phone_holder();
```

**Design rules:**
| Parameter | Guideline |
|-----------|-----------|
| `angle` | 65-75° for phones, 45-60° for tablets |
| `phone_w` | Device width (base = phone_w + 20-24mm) |
| `phone_t` | Device thickness + 2-4mm clearance |
| `grip` | 5-8mm inward tab (enough to hold, not block screen) |
| `arm_h` | 25-40mm (taller = more secure, but blocks more of device) |
| `back_h` | 40-60mm (supports upper portion of device) |
| `wall` | 4-5mm for structural strength |

**Optional additions:**
- **Cable slot**: `cube()` cut through back plate and shelf center
- **Rubber feet**: Small cylinders on base bottom
- **Landscape mode**: Wider shelf, shorter arms

**Pitfalls:**
- Simple lean stands (no side arms) let the phone slide off — add grip tabs for phones
- `rotate()` pivot is at the translate point — position back plate AT the back edge before rotating
- Side profile polygons self-intersect easily — use individual `cube()` pieces instead
- Grip tabs must face inward symmetrically — use `side == -1` conditional for x-position
- Shelf must extend from `shelf_y` all the way to the back plate foot — gap = phone falls through
- `90 - angle` for `rotate([x,0,0])` — NOT `angle` directly

**Discovered:** Phone holder session, 12 iterations. Simple lean stand (iter 1-9) looked like a bookend, not a holder. Complex side profile polygons self-intersected repeatedly (iter 3-8). Adding side arms with inward grip tabs (iter 11) made it a real cradle. Cradle approach is strictly better — holds device securely without relying on friction.

---

### Technique: CSG Furniture Assembly
Keywords: bookshelf, shelf, shelving, rack, cabinet, dresser, desk, table, nightstand, bookcase, display case, media console, TV stand, storage unit

**When to use:** Any freestanding furniture made of flat panels — bookshelves, cabinets, desks, tables, racks, display cases, storage units.

**What it is:** `union()` of `cube()` parts — side panels, shelves, top, bottom, back panel. Each component is a module. All dimensions parameterized at the top of the file.

**Why it works:** Furniture is fundamentally rectangular panels assembled at right angles. CSG primitives map perfectly — no curves needed. A `for()` loop handles evenly-spaced shelves.

**Decomposition pattern:**
1. **Plinth/base** — recessed toe kick for visual weight
2. **Side panels** — full height above plinth
3. **Top/bottom panels** — full width
4. **Back panel** — thin, flush with rear
5. **Internal shelves** — inset between sides, `for()` loop
6. **Crown** — optional overhang on top for finished look

**Proven code template:**
```openscad
$fn = 80;
height = 190;  width = 130;  depth = 32;
side_t = 3;  shelf_t = 2;  top_t = 4;  back_t = 1.5;
shelf_count = 5;  plinth_h = 10;  plinth_inset = 5;
crown_overhang = 2.5;

inner_w = width - 2 * side_t;
body_h = height - top_t - plinth_h;
shelf_spacing = body_h / (shelf_count + 1);

module plinth() {
    difference() {
        cube([width, depth, plinth_h]);
        translate([plinth_inset, -1, -1])
            cube([width - 2 * plinth_inset, plinth_inset + 1, plinth_h - 2]);
    }
}

module crown() {
    translate([-crown_overhang, -crown_overhang, height - top_t])
        cube([width + 2 * crown_overhang, depth + crown_overhang, top_t]);
}

union() {
    plinth();
    translate([0, 0, plinth_h]) cube([width, depth, shelf_t]);           // bottom
    translate([0, 0, height - top_t - shelf_t]) cube([width, depth, shelf_t]); // top
    crown();
    translate([0, 0, plinth_h]) cube([side_t, depth, body_h]);           // left side
    translate([width - side_t, 0, plinth_h]) cube([side_t, depth, body_h]); // right side
    translate([0, depth - back_t, plinth_h]) cube([width, back_t, body_h]); // back
    for (i = [1 : shelf_count])
        translate([side_t, 0, plinth_h + i * shelf_spacing])
            cube([inner_w, depth - back_t, shelf_t]);
}
```

**Proportion rules:**
| Parameter | Guideline |
|-----------|-----------|
| `side_t` | 3mm for 3D printing |
| `shelf_t` | 2-2.5mm (thinner than sides for visual hierarchy) |
| `top_t` | 3-5mm (thicker = crown effect) |
| `back_t` | 1.5-2mm (thinnest panel) |
| `plinth_h` | 5-8% of total height |
| `plinth_inset` | 3-6mm recess |
| `crown_overhang` | 2-4mm on front and sides |
| `depth` | 15-25% of height for bookshelves |

**Pitfalls:**
- Decorative extras (face frames, multi-layer crowns, center dividers) add complexity without enough payoff — keep it clean
- Shelves should NOT extend behind the back panel — use `depth - back_t`
- Side panels start at `plinth_h`, not z=0 — the plinth is its own piece
- `for()` loop for shelves is cleaner than placing each shelf manually
- Shelf thickness thinner than side thickness gives visual hierarchy

**Discovered:** Bookshelf session, 10 iterations. Tried face frames (iter 4, too complex), two-layer crown (iter 6, too busy), center dividers (iter 7, not generalizable). Simplest approach was best — clean parametric template with plinth + crown + for-loop shelves.

---

### Technique: Hull-Sphere Path Handle
Keywords: handle, grip, cup handle, mug handle, jug, pitcher, teapot, stein, tankard

**When to use:** Adding a handle to any rotationally symmetric vessel — cups, mugs, jugs, pitchers, teapots, steins, tankards.

**What it is:** A semicircular path of `hull()`-connected `sphere()`s attached to the vessel wall. Each sphere is positioned along a D-shaped arc, and the attachment points use the vessel's `outer_r()` function to sit flush against the curved surface.

**Why it works:**
- `rotate_extrude(angle=180)` for handles is fast but nearly impossible to orient correctly — the rotation axes and translations fight each other
- `hull()` of many spheres ($fn=120) is correct but extremely slow (20s+/view)
- **Hull chain of low-$fn spheres (12 segments, $fn=16 per sphere) gives smooth results in <0.5s**

**The pattern:**
```openscad
// Get vessel outer radius at height z (from bezier body)
function outer_r(z) = ...;  // same bezier formula as body

// Handle path — semicircle in XZ plane
function handle_point(i) =
    let(
        a = i * 180 / segments,
        center_z = (top_z + bot_z) / 2,
        half_h = (top_z - bot_z) / 2,
        z = center_z + half_h * cos(a),
        cup_r = outer_r(z),
        min_offset = tube_r * 0.5,
        outward = max(min_offset, width * sin(a)),
        x = cup_r - 1 + outward
    )
    [x, 0, z];

// Tapered tube radius — thinner at sides
function handle_r(i) =
    let(a = i * 180 / segments)
    tube_r * (1 - 0.2 * sin(a));

module handle() {
    for (i = [0 : segments - 1])
        hull() {
            translate(handle_point(i))
                sphere(r = handle_r(i), $fn = 16);
            translate(handle_point(i + 1))
                sphere(r = handle_r(i + 1), $fn = 16);
        }
}
```

**Key parameters:**
| Parameter | Guideline |
|-----------|-----------|
| `width` | 15-22mm (how far handle extends from vessel) |
| `top_z` | 75-85% of cup height |
| `bot_z` | 25-30% of cup height (NOT lower — pokes through narrow base) |
| `tube_r` | 3-4mm cross-section radius |
| `segments` | 10-12 (fewer = angular, more = slow) |
| `$fn` per sphere | 16 (invisible at this scale, fast) |

**Speed comparison:**
| Approach | Render time | Quality |
|----------|-------------|---------|
| `rotate_extrude(180)` half-torus | 0.15s | Wrong orientation, hard to control |
| `hull()` + `sphere($fn=120)` x11 | 20s+ | Smooth but too slow |
| `hull()` + `sphere($fn=16)` x12 | 0.5s | Smooth and fast |

**Pitfalls:**
- `rotate_extrude` handles look simple but orienting them correctly requires nested rotations that are extremely error-prone — avoid
- Bottom attachment too low → handle pokes through cup body where it narrows. Keep `bot_z >= 0.25 * height`
- Must use `outer_r(z)` for attachment points — hardcoded radius misaligns on curved vessels
- `min_offset = tube_r * 0.5` at endpoints prevents spheres from poking into vessel wall
- Tapering handle (thinner at sides, 0.8x) looks more elegant than uniform thickness

**Discovered:** Cup session, 10 iterations. rotate_extrude orientation failed (iter 2-3). Hull+sphere at $fn=120 was 20s/view (iter 1). Hull+sphere at $fn=16 with 12 segments was the breakthrough — 0.5s and visually identical (iter 4+). Bottom attachment poking through fixed by raising bot_z (iter 9b).

---

### Technique: Additive Diamond Knurl
Keywords: knurl, knurled, knob, grip knob, thumb wheel, control knob, dial, textured grip, diamond pattern, cross-hatch

**When to use:** Any object with a diamond-pattern knurl texture on its surface — knobs, dials, thumb wheels, control knobs, grip rings, adjustment wheels, potentiometer caps.

**What it is:** Build the main body at a slightly smaller radius (`knob_r`), then add diamond-shaped peaks on top using the **intersection of two sets of opposing helical ridges**. Each set is a `for()` loop of `linear_extrude(twist=...)` triangular profiles. The intersection of the two twisted sets produces diamond-shaped peaks — exactly like real knurling.

**Why additive (not subtractive):** Cutting grooves from a solid body ALWAYS cuts too deep — the two opposing groove sets overlap inside the wall and create a lattice/cage effect. Building ridges outward from a solid base is geometrically safe: the base body stays intact, and only the peaks protrude.

**Pattern:**
```openscad
$fn = 120;
knob_r = 14;      // base radius (solid body)
knurl_r = 16;     // peak radius (ridges extend to here)
n_ridges = 28;    // ridges per set
helix_twist = 50; // degrees of twist over grip height
ridge_width = 1.5;

module helical_ridges(twist_dir = 1) {
    for (i = [0 : n_ridges - 1])
        rotate([0, 0, i * 360 / n_ridges])
            linear_extrude(height = grip_h, twist = twist_dir * helix_twist, slices = 40)
                polygon(points=[
                    [knob_r - 0.5, 0],        // anchor inside body for overlap
                    [knurl_r, -ridge_width],   // outer left
                    [knurl_r, ridge_width],    // outer right
                ]);
}

module knurl_band() {
    intersection() {
        translate([0, 0, grip_start]) helical_ridges(1);
        translate([0, 0, grip_start]) helical_ridges(-1);
    }
}

difference() {
    union() {
        knob_body();    // rotate_extrude at knob_r
        knurl_band();   // diamond peaks extending to knurl_r
    }
    cylinder(r = bore_r, h = knob_h + 2);  // center bore
}
```

**Tuning the look:**
| Parameter | Effect |
|-----------|--------|
| `knurl_r - knob_r` | Ridge height — 1.5-2mm looks best. Below 1mm is invisible |
| `n_ridges` | Diamond count — 24-32 is typical. More = finer texture |
| `helix_twist` | Diagonal angle — 40-60° gives clear diamonds. Below 30° looks like straight ridges |
| `ridge_width` | Peak sharpness — 1.0-1.5mm. Wider = flatter tops, narrower = sharper peaks |
| `slices` | Twist resolution — 40 is smooth. Below 20 gets faceted |

**Typical knob anatomy:**
- **Base flange**: `base_r` > `knurl_r`, 2-3mm tall — gives a stable machined look
- **Grip zone**: cylindrical section with knurl, occupies 60-70% of total height
- **Dome top**: smooth `rotate_extrude` polygon with 5+ points for a quarter-circle arc
- **Center bore**: `bore_r = 3.1mm` for standard 6mm shaft

**Pitfalls:**
- **NEVER use subtractive grooves for knurling** — two sets of opposing cuts always hollow out the wall, creating a cage/lattice instead of surface texture. This failed consistently across 3 iterations.
- Triangle ridge polygon must anchor ~0.5mm INSIDE the body (`knob_r - 0.5`) to ensure watertight overlap — otherwise gaps appear between body and ridges
- The `knob_r` (body) must be smaller than `knurl_r` (peaks) — if they're equal, the ridges have zero height
- Keep `grip_h` as a separate variable for the knurl band — don't knurl the dome or base
- Dome profile needs 5+ polygon points for smooth curvature — fewer points look angular

**Discovered:** Knurled knob session, 7 iterations. Subtractive V-grooves failed completely (iter 1-3) — cuts always penetrated through the wall regardless of depth settings. Switching to additive intersection of opposing helical ridges (iter 4) was the breakthrough. Ridge height tuned from 1mm (too subtle, iter 4-5) to 2mm (clear diamonds, iter 6-7).

---

### Technique: Stepped CSG Tray with Internal Dividers
Keywords: organizer, desk organizer, caddy, tray, divider, compartment, sorter, holder, pen holder, storage, multi-compartment, tiered, stepped, tool holder, craft organizer, makeup organizer, cutlery tray, drawer organizer

**When to use:** Any multi-compartment container where sections have different heights — desk organizers, tiered storage caddies, tool holders, craft organizers, makeup organizers, cutlery trays, drawer dividers, workshop part bins.

**What it is:** Build a stepped solid body from non-overlapping cubes (one per height zone), optionally clip outer corners via `intersection()` with a rounded rectangle, then carve all compartment cavities with a single `difference()` operation. Dividers emerge naturally as the solid material left between adjacent cavities — no explicit divider geometry needed.

**Why non-overlapping cubes are critical:** If solid sections overlap (e.g., overlapping `hull()` shapes), the overlapping material fills in cavities carved by `difference()`. Each height zone MUST be a separate cube placed edge-to-edge with no overlap.

**Architecture:**
```
1. Define sections: [x_position, width, height] for each height zone
2. Union non-overlapping cubes (one per zone) — creates stepped solid
3. Intersection with rbox() — rounds only the 4 outer corners
4. Difference with cavity cubes — creates compartments
5. Dividers = solid material between adjacent cavities
```

**Proven code template:**
```openscad
$fn = 120;
wall = 3;          // outer wall thickness
bottom = 3;        // floor thickness
div_t = 2.5;       // divider thickness
corner_r = 5;      // outer corner radius
total_w = 200;
total_d = 100;

// Section definitions
sec1_w = 48;  sec1_h = 85;   // tall (pens)
sec2_w = 82;  sec2_h = 45;   // medium (cards)
sec3_w = 70;  sec3_h = 22;   // shallow (tray)

module rbox(w, d, h, r) {
    hull() {
        translate([r, r, 0]) cylinder(r=r, h=h);
        translate([w-r, r, 0]) cylinder(r=r, h=h);
        translate([r, d-r, 0]) cylinder(r=r, h=h);
        translate([w-r, d-r, 0]) cylinder(r=r, h=h);
    }
}

module organizer() {
    difference() {
        intersection() {
            union() {
                cube([sec1_w, total_d, sec1_h]);
                translate([sec1_w, 0, 0]) cube([sec2_w, total_d, sec2_h]);
                translate([sec1_w + sec2_w, 0, 0]) cube([sec3_w, total_d, sec3_h]);
            }
            rbox(total_w, total_d, sec1_h, corner_r);
        }
        // Cavities — dividers are the gaps between them
        translate([wall, wall, bottom])
            cube([sec1_w - wall - div_t/2, total_d - 2*wall, sec1_h]);
        translate([sec1_w + div_t/2, wall, bottom])
            cube([sec2_w - div_t, total_d - 2*wall, sec2_h]);
        translate([sec1_w + sec2_w + div_t/2, wall, bottom])
            cube([sec3_w - wall - div_t/2, total_d - 2*wall, sec3_h]);
    }
}

translate([-total_w/2, -total_d/2, 0]) organizer();
```

**Divider placement rules:**
| Divider Type | How to Create |
|-------------|---------------|
| Between sections (vertical, full depth) | Leave `div_t` gap between section cubes — OR — `div_t/2` margin on each cavity's X edge |
| Within section (horizontal, splits front/back) | Two cavities with `div_t` gap between their Y edges |
| Within section (vertical, splits left/right) | Two cavities with `div_t` gap between their X edges |

**Sizing guidelines:**
| Parameter | Guideline |
|-----------|-----------|
| `wall` | 2.5-4mm outer walls |
| `div_t` | 2-3mm internal dividers (thinner than walls) |
| `bottom` | 2-3mm floor |
| `corner_r` | 3-6mm for subtle rounding |
| Tall section | 70-100mm (pens, tools) |
| Medium section | 35-55mm (cards, supplies) |
| Shallow section | 15-30mm (tray, phone) |

**Pitfalls:**
- Overlapping solid bodies fill in cavities — sections MUST be non-overlapping cubes
- Separate compartment boxes create double walls (2x thickness) — use single-body + cavities
- hull() with tiny cylinders at internal joints creates bowtie distortion — only round outer corners
- Cavity must extend past section top to fully open
- rbox height must equal tallest section height

**Discovered:** Desk organizer session, 10 iterations. Key breakthrough at iteration 4: non-overlapping cubes prevent cavity fill-in. Iterations 0-3 failed because overlapping rounded rectangles created solid material over carved cavities. intersection() for outer corner rounding discovered at iteration 6.

---

### Technique: Twisted Wavy Extrusion
Keywords: twist, twisted, spiral, swirl, wavy, fluted twist, helix, decorative vase, twisted vase, spiral vase

**When to use:** Any object with a twisting/spiraling surface pattern — twist vases, spiral columns, decorative vessels with swirling ridges. These are NOT rotationally symmetric (the cross-section is wavy, not circular), so `rotate_extrude()` won't work.

**What it is:** Stack hull'd pairs of thin wavy-polygon slices at incremental heights and rotations. A bezier function scales the cross-section at each height to create the overall silhouette.

**Why it beats alternatives:**
- `linear_extrude(twist=)` → can't taper (straight cylinder only, or linear scale)
- `linear_extrude(twist=) + intersection` with envelope → clips ridges at belly, creates holes in walls
- `rotate_extrude()` → can't make non-circular cross-sections
- **Hull-slice with bezier scaling → full control over both twist pattern AND silhouette**

**The 5 parameters:**
- **r_base** = average radius of the wavy cross-section (28mm typical)
- **amp** = wave amplitude (4-5mm for visible but elegant ridges)
- **waves** = number of wave peaks (6 = classic, 4 = bold, 8 = delicate)
- **twist_angle** = total rotation over height (270-360° = one full spiral)
- **bezier P0-P4** = silhouette control (same as profile revolution technique)

**Proven code template:**
```openscad
$fn = 100;
height = 150;
twist_angle = 330;
n_slices = 200;

function vase_radius(t) =
    (1-t)*(1-t)*(1-t)*(1-t) * 0.55
    + 4*(1-t)*(1-t)*(1-t)*t * 1.15
    + 6*(1-t)*(1-t)*t*t * 1.0
    + 4*(1-t)*t*t*t * 0.65
    + t*t*t*t * 0.50;

module wavy(r_base, amp, waves) {
    n = 120;
    polygon(points = [
        for (i = [0 : n - 1])
            let(
                angle = i * 360 / n,
                r = r_base + amp * cos(angle * waves)
            )
            [r * cos(angle), r * sin(angle)]
    ]);
}

module twisted_shell(r_base, amp, waves) {
    for (i = [0 : n_slices - 1]) {
        z1 = i * height / n_slices;
        z2 = (i + 1) * height / n_slices;
        s1 = vase_radius(z1 / height);
        s2 = vase_radius(z2 / height);
        hull() {
            translate([0, 0, z1])
                rotate([0, 0, z1 / height * twist_angle])
                    linear_extrude(height = 0.01)
                        scale([s1, s1]) wavy(r_base, amp, waves);
            translate([0, 0, z2])
                rotate([0, 0, z2 / height * twist_angle])
                    linear_extrude(height = 0.01)
                        scale([s2, s2]) wavy(r_base, amp, waves);
        }
    }
}

module base_disc() {
    cylinder(h = 2, r = 17);
}

difference() {
    union() {
        base_disc();
        twisted_shell(r_base = 30, amp = 4, waves = 6);
    }
    translate([0, 0, 3])
        twisted_shell(r_base = 27, amp = 4, waves = 6);
    translate([0, 0, height - 0.5])
        cylinder(h = 5, r = 50);
}
```

**Pitfalls:**
- `linear_extrude(twist=)` alone → straight cylinder, can't taper
- Intersection with bezier envelope → clips ridges, creates holes in walls
- Polygon points < 100 → visible hatching/triangulation artifacts on surface
- Polygon points > 200 → slow renders, moire patterns
- Ridge amplitude > 6mm → drill bit, not vase
- Ridge amplitude < 3mm → twist not visible
- Inner cavity must reach full height → or top appears solid
- Always cut top with cylinder to guarantee open mouth
- Wall thickness (outer r_base - inner r_base) < 2mm → not printable
- n_slices < 100 → visible staircase steps

**Discovered:** Twist vase session, 10 iterations. linear_extrude (iter 1) → hull-slice (iter 2, best) → intersection (iter 4, smooth but clips) → refined hull-slice (iter 7, best overall).

---

---

### Technique: Twisted Wavy Extrusion
Keywords: twist, twisted, spiral, swirl, wavy, fluted twist, helix, decorative vase, twisted vase, spiral vase

**When to use:** Any object with a twisting/spiraling surface pattern — twist vases, spiral columns, decorative vessels with swirling ridges. These are NOT rotationally symmetric (the cross-section is wavy, not circular), so `rotate_extrude()` won't work.

**What it is:** Stack hull'd pairs of thin wavy-polygon slices at incremental heights and rotations. A bezier function scales the cross-section at each height to create the overall silhouette.

**Why it beats alternatives:**
- `linear_extrude(twist=)` → can't taper (straight cylinder only, or linear scale)
- `linear_extrude(twist=) + intersection` with envelope → clips ridges at belly, creating holes
- `rotate_extrude()` → can't make non-circular cross-sections
- **Hull-slice with bezier scaling → full control over both twist pattern AND silhouette**

**The 5 parameters:**
- **r_base** = average radius of the wavy cross-section (28mm typical)
- **amp** = wave amplitude (4-5mm for visible but elegant ridges)
- **waves** = number of wave peaks (6 = classic, 4 = bold, 8 = delicate)
- **twist_angle** = total rotation over height (270-360° = one full spiral)
- **bezier P0-P4** = silhouette control (same as profile revolution technique)

**Proven code template:**
```openscad
$fn = 100;
height = 150;
twist_angle = 330;
n_slices = 200;

function vase_radius(t) =
    (1-t)*(1-t)*(1-t)*(1-t) * 0.55
    + 4*(1-t)*(1-t)*(1-t)*t * 1.15
    + 6*(1-t)*(1-t)*t*t * 1.0
    + 4*(1-t)*t*t*t * 0.65
    + t*t*t*t * 0.50;

module wavy(r_base, amp, waves) {
    n = 120;
    polygon(points = [
        for (i = [0 : n - 1])
            let(
                angle = i * 360 / n,
                r = r_base + amp * cos(angle * waves)
            )
            [r * cos(angle), r * sin(angle)]
    ]);
}

module twisted_shell(r_base, amp, waves) {
    for (i = [0 : n_slices - 1]) {
        z1 = i * height / n_slices;
        z2 = (i + 1) * height / n_slices;
        s1 = vase_radius(z1 / height);
        s2 = vase_radius(z2 / height);
        hull() {
            translate([0, 0, z1])
                rotate([0, 0, z1 / height * twist_angle])
                    linear_extrude(height = 0.01)
                        scale([s1, s1]) wavy(r_base, amp, waves);
            translate([0, 0, z2])
                rotate([0, 0, z2 / height * twist_angle])
                    linear_extrude(height = 0.01)
                        scale([s2, s2]) wavy(r_base, amp, waves);
        }
    }
}

module base_disc() {
    cylinder(h = 2, r = 17);
}

difference() {
    union() {
        base_disc();
        twisted_shell(r_base = 30, amp = 4, waves = 6);
    }
    translate([0, 0, 3])
        twisted_shell(r_base = 27, amp = 4, waves = 6);
    translate([0, 0, height - 0.5])
        cylinder(h = 5, r = 50);
}
```

**Pitfalls:**
- `linear_extrude(twist=)` alone → straight cylinder, can't taper
- Intersection with bezier envelope → clips ridges, creates holes in walls
- Polygon points < 100 → visible hatching/triangulation artifacts on surface
- Polygon points > 200 → slow renders, moire patterns
- Ridge amplitude > 6mm → drill bit, not vase
- Ridge amplitude < 3mm → twist not visible
- Inner cavity must reach full height → or top appears solid
- Always cut top with cylinder to guarantee open mouth
- Wall thickness (outer r_base - inner r_base) < 2mm → not printable
- n_slices < 100 → visible staircase steps

**Discovered:** Twist vase session, 10 iterations. linear_extrude (iter 1) → hull-slice (iter 2, best) → intersection (iter 4, smooth but clips) → refined hull-slice (iter 7, best overall).

---

### Technique: Stepped CSG Tray with Internal Dividers
Keywords: organizer, desk organizer, caddy, tray, divider, compartment, sorter, holder, pen holder, storage, multi-compartment, tiered, stepped, tool holder, craft organizer, makeup organizer, cutlery tray, drawer organizer

**When to use:** Any multi-compartment container where sections have different heights — desk organizers, tiered storage caddies, tool holders, craft organizers, makeup organizers, cutlery trays, drawer dividers, workshop part bins.

**What it is:** Build a stepped solid body from non-overlapping cubes (one per height zone), optionally clip outer corners via `intersection()` with a rounded rectangle, then carve all compartment cavities with a single `difference()` operation. Dividers emerge naturally as the solid material left between adjacent cavities — no explicit divider geometry needed.

**Why non-overlapping cubes are critical:** If solid sections overlap (e.g., overlapping `hull()` shapes), the overlapping material fills in cavities carved by `difference()`. Each height zone MUST be a separate cube placed edge-to-edge with no overlap.

**Architecture:**
```
1. Define sections: [x_position, width, height] for each height zone
2. Union non-overlapping cubes (one per zone) — creates stepped solid
3. Intersection with rbox() — rounds only the 4 outer corners
4. Difference with cavity cubes — creates compartments
5. Dividers = solid material between adjacent cavities
```

**Proven code template:**
```openscad
$fn = 120;
wall = 3;          // outer wall thickness
bottom = 3;        // floor thickness
div_t = 2.5;       // divider thickness
corner_r = 5;      // outer corner radius
total_w = 200;
total_d = 100;

// Section definitions
sec1_w = 48;  sec1_h = 85;   // tall (pens)
sec2_w = 82;  sec2_h = 45;   // medium (cards)
sec3_w = 70;  sec3_h = 22;   // shallow (tray)

module rbox(w, d, h, r) {
    hull() {
        translate([r, r, 0]) cylinder(r=r, h=h);
        translate([w-r, r, 0]) cylinder(r=r, h=h);
        translate([r, d-r, 0]) cylinder(r=r, h=h);
        translate([w-r, d-r, 0]) cylinder(r=r, h=h);
    }
}

module organizer() {
    difference() {
        intersection() {
            union() {
                cube([sec1_w, total_d, sec1_h]);
                translate([sec1_w, 0, 0]) cube([sec2_w, total_d, sec2_h]);
                translate([sec1_w + sec2_w, 0, 0]) cube([sec3_w, total_d, sec3_h]);
            }
            rbox(total_w, total_d, sec1_h, corner_r);
        }
        // Cavities — place cubes, dividers are the gaps between them
        // Section 1: two pen slots + supply cubby
        translate([wall, total_d*0.45 + div_t/2, bottom])
            cube([sec1_w/2 - wall - div_t/4, total_d*0.55 - wall - div_t/2, sec1_h]);
        translate([sec1_w/2 + div_t/4, total_d*0.45 + div_t/2, bottom])
            cube([sec1_w/2 - div_t/4 - div_t/2, total_d*0.55 - wall - div_t/2, sec1_h]);
        translate([wall, wall, bottom])
            cube([sec1_w - wall - div_t/2, total_d*0.45 - wall - div_t/2, sec1_h]);
        // Section 2: two compartments (front/back)
        translate([sec1_w + div_t/2, total_d/2 + div_t/2, bottom])
            cube([sec2_w - div_t, total_d/2 - wall - div_t/2, sec2_h]);
        translate([sec1_w + div_t/2, wall, bottom])
            cube([sec2_w - div_t, total_d/2 - wall - div_t/2, sec2_h]);
        // Section 3: one wide tray
        translate([sec1_w + sec2_w + div_t/2, wall, bottom])
            cube([sec3_w - wall - div_t/2, total_d - 2*wall, sec3_h]);
    }
}

translate([-total_w/2, -total_d/2, 0]) organizer();
```

**Divider placement rules:**
| Divider Type | How to Create |
|-------------|---------------|
| Between sections (vertical, full depth) | Leave `div_t` gap between section cubes at solid body level — OR — leave `div_t/2` margin on each cavity's X edge |
| Within section (horizontal, splits front/back) | Two cavities with `div_t` gap between their Y edges |
| Within section (vertical, splits left/right) | Two cavities with `div_t` gap between their X edges |

**Sizing guidelines:**
| Parameter | Guideline |
|-----------|-----------|
| `wall` | 2.5-4mm for outer walls (FDM printing) |
| `div_t` | 2-3mm for internal dividers (thinner than walls) |
| `bottom` | 2-3mm floor thickness |
| `corner_r` | 3-6mm for subtle rounding |
| Section widths | 40-100mm per section |
| Tall section | 70-100mm (pens, tools) |
| Medium section | 35-55mm (cards, supplies) |
| Shallow section | 15-30mm (tray, phone) |

**How to adapt for different organizer types:**
| Object | Sections | Heights | Notes |
|--------|----------|---------|-------|
| Desk organizer | 3 sections, 6 compartments | 85/45/22 | Pen slots + storage + tray |
| Tool caddy | 2-3 sections | 120/60 | Deep for tools |
| Craft organizer | 4+ sections, all medium | 40/40/40/40 | Equal compartments, grid |
| Cutlery tray | 1 section, all same height | 40 | Grid of long narrow slots |
| Makeup organizer | 3 sections, many small | 80/50/30 | Narrow slots for brushes |

**Pitfalls:**
- Overlapping solid bodies fill in cavities — sections MUST be non-overlapping cubes
- Separate compartment boxes create double walls (2x thickness) — use single-body + cavities
- hull() with tiny cylinders at internal joints creates bowtie distortion — only round outer corners
- Cavity must extend past section top (use `sec_h + 1` or just `sec_h` since it's already above) to fully open
- rbox height must equal tallest section height
- Don't try to round internal divider edges — too complex, unnecessary for functional parts
- Cavity must extend past section top to fully open
**Discovered:** Desk organizer session, 10 iterations. Key breakthrough at iteration 4: non-overlapping cubes prevent cavity fill-in. Iterations 0-3 failed because overlapping rounded rectangles created solid material over carved cavities. intersection() for outer corner rounding discovered at iteration 6.

---

### Technique: Hex Grid Lattice with Circular Clip
Keywords: coaster, trivet, honeycomb, hex grid, hexagonal, lattice, grille, drain, grate, perforated, mesh, pattern, screen, vent cover

**When to use:** Any flat circular object with a repeating hexagonal pattern — coasters, trivets, drain covers, speaker grilles, decorative plates, vent covers, pot trivets.

**What it is:** A hex grid of through-holes (or pockets) cut from a flat disc, clipped to a circle with `intersection()`, then combined with a raised rim ring via `union()`.

**Why it beats alternatives:**
- Offset grid with `col % 2` breaks with negative columns — axial coordinates work correctly
- Placing hex cells by center-distance check leaves messy partial walls at the boundary — `intersection()` with a cylinder clips cleanly
- Building rim as separate ring and `union()`-ing on top covers boundary artifacts

**The hex grid math:**
```
grid_r = spacing parameter (controls density)
wall = desired wall thickness between cells
cell_r = grid_r - wall / sqrt(3)    // hex cutout circumradius

// Axial to cartesian (flat-top hexagons):
x = grid_r * sqrt(3) * (q + r / 2)
y = grid_r * 1.5 * r
// All neighbor distances are equal: grid_r * sqrt(3)
// Wall between any two adjacent cells: sqrt(3) * (grid_r - cell_r) = wall  ✓
```

**Build order (critical):**
1. Cut hex grid from a full disc
2. `intersection()` with inner circle to clip boundary
3. `union()` with rim ring (which sits taller than the lattice)

**Proven code template:**
```openscad
$fn = 80;
coaster_d = 100;  coaster_h = 4;  rim_h = 3.5;
border_w = 5;  chamfer = 0.8;
grid_r = 6;  wall = 1.5;
cell_r = grid_r - wall / sqrt(3);

module hex_lattice() {
    intersection() {
        cylinder(h = coaster_h, d = coaster_d - border_w * 2);
        difference() {
            cylinder(h = coaster_h, d = coaster_d);
            for (q = [-8 : 8])
                for (r = [-8 : 8]) {
                    x = grid_r * sqrt(3) * (q + r / 2);
                    y = grid_r * 1.5 * r;
                    if (sqrt(x*x + y*y) < coaster_d / 2)
                        translate([x, y, -1])
                            cylinder(h = coaster_h + 2, r = cell_r, $fn = 6);
                }
        }
    }
}

module rim_ring() {
    difference() {
        cylinder(h = coaster_h + rim_h, d = coaster_d);
        translate([0, 0, -1])
            cylinder(h = coaster_h + rim_h + 2, d = coaster_d - border_w * 2);
        // Top chamfer
        translate([0, 0, coaster_h + rim_h - chamfer])
            difference() {
                cylinder(h = chamfer + 1, r = coaster_d / 2 + 1);
                cylinder(h = chamfer + 1, r1 = coaster_d / 2, r2 = coaster_d / 2 - chamfer);
            }
        // Bottom chamfer
        translate([0, 0, -1])
            difference() {
                cylinder(h = chamfer + 1, r = coaster_d / 2 + 1);
                cylinder(h = chamfer + 1, r1 = coaster_d / 2 - chamfer, r2 = coaster_d / 2);
            }
    }
}

union() { hex_lattice(); rim_ring(); }
```

**Tuning:**
| Parameter | Effect |
|-----------|--------|
| `grid_r` | Density — smaller = more cells (6 ≈ 60 cells for 100mm disc) |
| `wall` | Wall thickness between cells — 1.2-2.0mm for 3D printing |
| `cell_r` | Derived from grid_r and wall — don't set independently |
| `border_w` | Rim ring width — 4-8mm |
| `rim_h` | Rim height above base — 2-4mm for coasters |
| `chamfer` | Edge chamfer — 0.5-1.0mm |
| `coaster_h` | Base/lattice thickness — 3-5mm |

**Pitfalls:**
- Never use `col % 2` for hex grid offset — breaks with negative indices in OpenSCAD
- Always use axial coordinates: `x = grid_r * sqrt(3) * (q + r/2)`, `y = grid_r * 1.5 * r`
- Always clip the lattice with `intersection()` — otherwise boundary cells leave messy partial walls
- Build rim as separate module, `union()` on top — don't try to carve rim from the same body as the hex cuts
- `$fn = 6` on hex cells only, `$fn = 80+` on everything else (rim, clip cylinder)
- Through-cuts are more visually striking than pockets — for coasters, go all the way through

**Discovered:** Honeycomb coaster session, 10 iterations. Key breakthroughs: axial coordinates (iter 2), through-cuts (iter 5), intersection clip (iter 9).

---

### Technique: Conical Revolution with Quadratic Spout Blend
Keywords: funnel, hopper, cone, pour-over, strainer, filter, conical, spout, nozzle, separator, filling funnel

**When to use:** Any object that is primarily a straight-sided cone with a cylindrical spout or nozzle — kitchen funnels, industrial hoppers, pour-over coffee drippers, strainers, filling funnels, powder funnels.

**What it is:** `rotate_extrude()` with a polygon profile composed of three distinct zones: a straight cylindrical spout, a quadratic (t²) concave transition zone, and a straight conical body. Unlike bezier revolution (which uses smooth curves throughout), this technique keeps the cone walls straight and only curves the spout-to-cone junction.

**Why it beats bezier revolution for funnels:**
- Bezier curves the entire profile → bowl/wine-glass shape (not a funnel)
- Power curves (t^0.5 to t^0.7) → too much curvature everywhere
- Straight cone + quadratic transition → looks like a real funnel

**The three zones:**
```
Zone 1: Cylindrical spout      (z = 0 to spout_h)        → straight vertical walls
Zone 2: Quadratic transition   (z = spout_h to spout_h + 25% of body)  → concave curve (t²)
Zone 3: Straight cone          (z = transition top to mouth)   → linear taper
```

**Proportions for a kitchen funnel:**
| Parameter | Guideline |
|-----------|-----------|
| `mouth_r` | 50-65mm (120mm diameter mouth) |
| `spout_r` | 7-10mm (14-20mm diameter spout) |
| `spout_h` | 35-40mm (~35% of total height) |
| `body_h` | 60-70mm (~60% of total height) |
| `transition_frac` | 0.20-0.30 of body height |
| `wall` | 2-3mm |
| `mouth_r / spout_r ratio` | 6:1 to 8:1 |

**Optional details:**
- **Drip lip**: 0.3-0.5mm flare at spout bottom prevents drips from running back up
- **Reinforcement ring**: 1mm bump at spout-cone junction (structural + visual)
- **Rolled rim**: 1.5-2mm outward roll at mouth top for strength and pour control
- **Spout taper**: Slightly narrower at bottom (7mm) than top (8mm) for drip control

**Pitfalls:**
- Using bezier/power curves for the whole body → bowl shape, not a funnel
- Transition zone > 30% of body → too much curvature, looks like a bowl
- Transition zone < 15% of body → hard angle at spout junction
- Spout shorter than 30mm → looks stubby, not functional
- Missing inner wall → solid block
- Piecewise curve kinks → ensure radius continuity at zone boundaries

**Discovered:** Kitchen funnel retrain session, 10 iterations. Bowl-shaped power curves (iter 2, 7) vs straight cone + quadratic blend (iter 3-5, 8-9). The key insight: a funnel's identity comes from its straight conical walls, not from smooth curves.

---

### Technique: Gear with Hub and Keyway Assembly
Keywords: spur gear, hub, keyway, shaft, bore, keyed gear, power transmission, hub gear, shaft gear, mounted gear

**When to use:** Any gear that needs to mount on a shaft — spur gears with hubs, keyed gears, shaft-mounted sprockets, toothed pulleys with bores.

**What it is:** Combines the Radial Tooth Addition technique with hub and keyway features. The gear body (root disc + teeth) is built additively, then a hub cylinder extends above the gear face with a shoulder ring at the junction. A bore and keyway are cut through the full assembly.

**Architecture:**
```
1. Root disc (cylinder at root_r)
2. + Teeth (for loop × rotate × linear_extrude polygon)
3. + Hub (cylinder through gear + above, with shoulder ring)
4. - Bore (cylinder through all)
5. - Keyway (cube at bore edge, through all)
6. - Chamfers (hub top, bore edges)
```

**Hub shoulder ring (critical detail):**
```openscad
// At gear-hub junction — makes hub look integral, not glued on
translate([0, 0, gear_thickness])
    cylinder(h = 1.5, r1 = hub_d/2 + 1.5, r2 = hub_d/2);
```

**Keyway placement:**
```openscad
// Standard keyway: flat cut into bore wall at +X side
translate([bore_d/2 - key_depth, -key_width/2, -1])
    cube([key_depth + 1, key_width, total_height + 2]);
```

**Tooth count adjustment — interpolation ratios:**
| Teeth | root_half | tip_half | pitch_half |
|-------|-----------|----------|------------|
| 12    | 0.35      | 0.10     | 0.20       |
| 16    | 0.32      | 0.12     | 0.22       |
| 20    | 0.30      | 0.18     | 0.25       |
| 24+   | 0.28      | 0.20     | 0.25       |

**Hub proportions:**
- Hub diameter: 2× bore diameter (minimum)
- Hub height: equal to or slightly greater than gear thickness
- Hub shoulder height: 1-2mm
- Hub shoulder overhang: equal to shoulder height

**Pitfalls:**
- Don't use intersection with cones for tooth edge chamfers — clips aggressively, ruins model
- Hub shoulder ring is essential — without it hub looks artificially placed
- Keyway cube must extend past both ends (z = -1 to total_height + 2) to avoid z-fighting
- For fewer teeth (<16), widen root_half ratio to prevent teeth merging
- Hub must extend through the full gear thickness, not just sit on top

**Discovered:** Spur gear with hub session, 10 iterations. Key breakthrough was the hub shoulder ring (iter 7) which transformed the model from "cylinder on disc" to "integrated gear assembly."

---

### Technique: Piecewise Stem-Bowl Revolution
Keywords: wine glass, goblet, chalice, champagne, flute, coupe, snifter, stemware, cocktail glass, martini, stemmed vessel

**When to use:** Any stemmed vessel where a thin stem transitions to a wide bowl — wine glasses, champagne flutes, martini glasses, coupes, snifters, chalices. The key challenge is the dramatic radius change from stem (~3.5mm) to bowl (~44mm).

**What it is:** `rotate_extrude()` with a polygon profile built from three sections: explicit foot points, straight stem, and a two-segment bowl (smoothstep transition zone + bezier body).

**Why a single bezier fails for stemware:**
- Low P1 (< 30) → V-shaped/pointy bottom where bowl meets stem
- High P1 (> 38) → bulbous goblet, belly wider than rim
- The problem: bezier can't simultaneously start narrow (stem) AND have a round bottom AND stay wide at top

**The fix — two-segment bowl:**
1. **Transition zone** (0-20% of bowl height): smoothstep `3s²-2s³` from stem_r to ~28mm. This creates a controlled, gradual flare.
2. **Bowl body** (20-100%): 4th-degree bezier from 28mm to full width (~44mm). This handles the rounded bowl shape.

**How to dial in different stemware:**
| Shape | stem_r | transition_end | r_at_transition | Bowl P1-P4 | Why |
|-------|--------|---------------|-----------------|------------|-----|
| Wide wine glass | 3.5 | 0.20 | 28 | 44,45,44,43 | Wide open bowl |
| Champagne flute | 3 | 0.15 | 12 | 14,15,14,13 | Narrow tall bowl |
| Martini glass | 3.5 | 0.10 | 20 | 55,58,60,62 | Wide V-shape, rim widest |
| Coupe | 3.5 | 0.25 | 30 | 42,44,40,38 | Wide shallow bowl |
| Snifter | 4 | 0.30 | 35 | 45,48,44,35 | Wide belly, narrow rim |

**Proven code template:**
```openscad
$fn = 120;
total_h = 155;
foot_r = 37;  foot_h = 12;  stem_r = 3.5;  stem_h = 53;
bowl_start_h = foot_h + stem_h;
bowl_h = total_h - bowl_start_h;
wall = 2;

function bowl_profile(z_local) =
    let(t = z_local / bowl_h, transition_end = 0.20, r_at_transition = 28)
    t <= transition_end ?
        let(s = t / transition_end)
        stem_r + (r_at_transition - stem_r) * (3*s*s - 2*s*s*s)
    :
        let(s = (t - transition_end) / (1 - transition_end),
            P0 = r_at_transition, P1 = 44, P2 = 45, P3 = 44, P4 = 43)
        pow(1-s,4)*P0 + 4*pow(1-s,3)*s*P1 + 6*pow(1-s,2)*s*s*P2
        + 4*(1-s)*s*s*s*P3 + pow(s,4)*P4;

rotate_extrude() {
    polygon(points = concat(
        [[0, 0]],
        [[foot_r-2,0],[foot_r,0.5],[foot_r+1,2],[foot_r+0.5,3.5],
         [foot_r-0.5,5],[foot_r-3,7],[foot_r-8,9.5],
         [foot_r-16,11],[stem_r+3,foot_h-0.5],[stem_r+1,foot_h]],
        [[stem_r, foot_h+0.5], [stem_r, bowl_start_h]],
        [for (i = [0:1:bowl_h]) [bowl_profile(i), bowl_start_h + i]],
        [[bowl_profile(bowl_h), total_h],
         [bowl_profile(bowl_h)+0.3, total_h+0.3],
         [bowl_profile(bowl_h)-1, total_h+0.6]],
        [for (i = [bowl_h:-1:0])
            let(r = bowl_profile(i)) [max(2, r - wall), bowl_start_h + i]],
        [[stem_r-wall, bowl_start_h], [stem_r-wall, foot_h+0.5]],
        [[stem_r-0.5,foot_h],[stem_r+1,foot_h-0.5],
         [foot_r-17,11],[foot_r-9,9.5],[foot_r-4,7],
         [foot_r-1.5,5],[foot_r-0.5,3.5],[foot_r-1,2],
         [foot_r-2,1],[foot_r-3,0.5],[0,0.5]]
    ));
}
```

**Pitfalls:**
- Single bezier for stem-to-bowl → V-shaped or bulbous (can't do both narrow start AND round bottom)
- Piecewise linear+quadratic → cylindrical tumbler look with visible transition kink
- Smoothstep (3s²-2s³) is critical — plain quadratic (s²) creates a visible kink at the transition point
- Foot needs 8+ explicit points for visible profile; bezier foot looks too thin
- Foot edge should start inset from foot_r (e.g., foot_r-2) to create a raised rim
- stem_r < bowl_max_r/10 for "thin stem" look
- Rim within 5% of max width to avoid goblet look

**Discovered:** Wine glass session, 10 iterations. Single bezier (iter 0-1) → goblet. Piecewise quadratic+linear (iter 2) → tumbler. Reverted to single bezier with tuned P1 (iter 3-7) → acceptable but stem junction always angular. Two-segment smoothstep+bezier (iter 10) → smooth junction, best result.

---

### Technique: Profile-Embedded Decorative Band
Keywords: band, ring, decorative, goblet, chalice, ornate, ridged, banded, ringed, trophy, urn, column, baluster, pillar

**When to use:** Any rotationally symmetric object that needs a raised decorative band, ring, or ridge around the body — goblets, chalices, trophy cups, ornate vases, columns, balusters, candlesticks, urns.

**What it is:** Explicit polygon ridge-valley-ridge points embedded directly in the revolution profile, replacing a section of the bezier curve. Much faster than CSG torus union, more controllable than cosine/gaussian bumps.

**Why it beats alternatives:**
- CSG torus union → correct but extremely slow (~2.5 min per ring boolean)
- Single cosine bump → creates groove-ring-groove pattern, looks like two pieces stacked
- Gaussian bump → jarring transitions
- **Explicit polygon ridges → instant compile, precise control, clean shadow lines**

**The triple-ridge pattern (most decorative):**
```openscad
let(r0 = base_radius_at_band_position)
[
    [r0, band_z - 7],
    // Small flanking ridge
    [r0 + 0.6, band_z - 6], [r0 + 1.3, band_z - 5], [r0 + 0.6, band_z - 4],
    // Valley (slight inset creates shadow line)
    [r0 - 0.2, band_z - 3],
    // Main ridge (tallest)
    [r0 + 1.0, band_z - 1.5], [r0 + 3.0, band_z], [r0 + 1.0, band_z + 1.5],
    // Valley
    [r0 - 0.2, band_z + 3],
    // Small flanking ridge
    [r0 + 0.6, band_z + 4], [r0 + 1.3, band_z + 5], [r0 + 0.6, band_z + 6],
    [resume_r, band_z + 7],
]
```

**Two-section bezier for goblet/chalice:**
When the band divides the cup, use separate bezier curves above and below for independent control:
```openscad
// Lower bowl: LP0=stem_junction, LP1-LP3=belly, LP4=band_radius
// Upper cup: UP0=band_radius, UP1-UP2=concave_inward, UP3-UP4=rim_flare
```
This creates the authentic concave-then-flare upper cup profile seen on real chalices.

**Tuning the band:**
| Parameter | Effect |
|-----------|--------|
| Main ridge height (3.0) | Overall prominence — 2.0 subtle, 4.0 bold |
| Valley offset (-0.2) | Shadow depth — 0 flush, -0.5 deep groove |
| Flanking ridge height (1.3) | Secondary ridge size — omit for single ring |
| Band spacing (14mm total) | Spread — tighter = more compact detail |
| Number of ridges | 1 = simple ring, 3 = decorative, 5 = ornate |

**Pitfalls:**
- Torus CSG union works but is too slow for generation pipeline (~2.5 min per ring)
- Single smooth bump (cosine/gaussian) makes the cup look like two pieces stacked together
- Valley points must be slightly inset (negative offset) to create visible shadow lines
- Band position should be at the visual center of the cup, accounting for bowl curvature
- When using two bezier sections, ensure UP0 = LP4 for continuity at the band junction

**Discovered:** Goblet session, 10 iterations. Cosine bump (iter 0-3) → two-piece look. Torus CSG (iter 4-5) → correct but 2.5 min compile. Profile ridges (iter 6+) → instant, clean, controllable. Two-section bezier (iter 10) → best chalice character.

---

### Technique: C-Clamp with Snap-In Channels
Keywords: clip, clamp, cable clip, cable holder, cable organizer, desk mount, edge mount, snap-on, C-clamp, cable management, cord holder, wire clip, desk clip, cable tidy

**When to use:** Any clip/clamp that grips an edge and holds objects in channels — cable clips, desk-mounted organizers, edge-mount tool holders, pipe clips, hose clamps.

**What it is:** A C-shaped clamp body built from cubes (back plate + top/bottom jaws + snap lips), with cylindrical snap-in channels cut via `difference()`. Each channel is a cylinder + narrow rectangular entry slot creating a "keyhole" cross-section.

**Decomposition pattern:**
1. **Back plate** — vertical cube, full height, connects top and bottom jaws
2. **Top jaw** — horizontal block that sits on the surface, contains the cable channels
3. **Bottom jaw** — horizontal block that grips underneath
4. **Snap lips** — small overhangs on jaw tips that grip inward
5. **Cable channels** — cylindrical cuts with narrow entry slots from top

**Key dimensions:**
| Parameter | Guideline |
|-----------|-----------|
| `jaw_gap` | Target surface thickness + 0.5mm clearance |
| `clamp_depth` | 12-15mm for secure grip |
| `lip` | 2-3mm overhang for snap retention |
| `wall` | 3mm for FDM printing |
| `slot_w` | 60-70% of cable diameter (snap retention) |
| `cable_spacing` | cable_d + wall*2 minimum |
| `cradle_h` | cable_r + wall + 2mm (enough material above cable) |

**Critical: avoiding non-manifold geometry:**
- Use a SINGLE continuous cylinder cut from front face through entire depth — NOT two separate cylinders meeting at the back wall
- Don't use hull() for rounded edges on the cradle block — it creates non-manifold when intersected with cylinder cuts
- Use difference() (not union) for lip chamfers

**Pitfalls:**
- Separate front/back cylinder cuts meeting at wall boundary → non-manifold. Use single continuous cylinder.
- Square channels → cables don't seat properly. Always use cylindrical cradles.
- Entry slot too wide (>= cable_d) → no retention. Keep at 60-70% of cable_d.
- Hull-based rounded corners + cylinder cuts → non-manifold. Keep block geometry simple.
- Snap lips without chamfers → hard to insert onto desk. Chamfer with rotated cube difference.
- Cable spacing too tight → thin walls that won't print. Minimum spacing = cable_d + 2*wall.

**Discovered:** Cable clip session, 10 iterations. Key breakthroughs: (1) keyhole-shaped channels (cylinder + narrow slot) for snap retention (iter 3), (2) front openings make cables visible and the design recognizable (iter 5), (3) single continuous cylinder cuts avoid non-manifold (iter 8). Failed approaches: separate front/back cylinder booleans (non-manifold), hull-based rounded edges (non-manifold), square channels (poor cable seating).

---

### Technique: Open-Frame Angled Platform
Keywords: laptop stand, laptop riser, monitor riser, keyboard tray, angled platform, tilted surface, cooling stand, ventilated stand, ergonomic riser, desk stand, stand, riser, dock

**When to use:** Any stand/riser that holds a flat object at a fixed angle — laptop stands, keyboard trays, monitor risers, cooling pads, document holders, drawing boards.

**What it is:** An open-frame assembly of CSG primitives: two side panels (each composed of a bottom foot rail, back vertical leg, angled top rail, and diagonal brace), a hull-based angled platform, a split back wall for cable management, front lip, cross supports, ventilation slots, and optional rubber feet/anti-slip ridges.

**Why open-frame beats solid:** Solid triangular side panels make the stand look like a doorstop. Real laptop stands have visible open space underneath for airflow. The open-frame approach (foot + leg + brace) looks engineered and functional.

**Component decomposition:**
1. **Side panels** — bottom foot rail (full depth), back vertical leg, angled top rail (hull), diagonal brace (hull)
2. **Angled platform** — hull() between front edge at z=0 and back edge at z=rise
3. **Back wall** — two narrow pillars flanking a wide open cable channel, connected by a thin top bar
4. **Front lip** — full-width bar with rounded cylinder top edge
5. **Cross supports** — bars at 35% and 65% depth, sitting on floor
6. **Ventilation slots** — 3x4 grid, rotated perpendicular to angled surface
7. **Anti-slip ridges** — thin bars across platform surface
8. **Rubber feet** — cylinders at 4 corners

**Key geometry:**
```
rise = stand_d * sin(stand_angle)
```

**Proven code template:**
```openscad
$fn = 80;
stand_w = 300;  stand_d = 220;  stand_angle = 15;
panel_t = 5;  platform_t = 3;  front_lip_h = 12;
cable_slot_w = 140;  back_leg_w = 8;
rise = stand_d * sin(stand_angle);

module side_panel() {
    cube([stand_d, panel_t, panel_t]);
    translate([stand_d - back_leg_w, 0, 0])
        cube([back_leg_w, panel_t, rise + platform_t + 6]);
    hull() {
        cube([panel_t, panel_t, front_lip_h - 2]);
        translate([panel_t/2, panel_t/2, front_lip_h - 2])
            cylinder(r = panel_t/2, h = 2);
    }
    hull() {
        cube([panel_t, panel_t, platform_t]);
        translate([stand_d - back_leg_w - 1, 0, rise])
            cube([1, panel_t, platform_t]);
    }
    hull() {
        translate([35, 0, 0]) cube([4, panel_t, panel_t]);
        translate([stand_d - back_leg_w, 0, rise * 0.45])
            cube([4, panel_t, panel_t]);
    }
}
```

**Design rules:**
| Parameter | Guideline |
|-----------|-----------|
| `stand_angle` | 10-20° for laptops, 30-45° for tablets/books |
| `stand_w` | Device width + 20-30mm clearance |
| `stand_d` | 200-250mm for laptops |
| `cable_slot_w` | 40-50% of stand width for prominent channel |
| `front_lip_h` | 10-15mm (enough to catch edge, not block ports) |
| `panel_t` | 4-5mm for structural strength |
| `platform_t` | 3mm (thinner than panels for visual hierarchy) |
| `back_leg_w` | 8-10mm |
| Diagonal brace target | ~45% of rise height for visual balance |

**Optional additions:**
- Anti-slip ridges: thin bars (0.8mm tall) across platform surface
- Rubber feet: cylinders at 4 corners
- Rounded front lip: cylinder along top edge
- Logo recess: shallow difference() in platform center

**Pitfalls:**
- Solid side panels = doorstop appearance. Use open-frame (foot + leg + brace)
- Solid back wall = cable slot invisible. Split into two pillars with open channel
- Cable channel floor = still looks solid. Make it fully open, just a top connecting bar
- Vertical vent slots on angled surface = ugly edges. Rotate perpendicular: `rotate([0, -angle, 0])`
- No diagonal brace = flimsy looking. One clean hull() brace adds structure
- Two braces = cluttered. One diagonal is visually cleaner than two
- `rise = depth * sin(angle)` not `depth * tan(angle)` — sin is the correct trig for the rise

**Discovered:** Laptop stand retrain session, 10 iterations. Key breakthroughs: (1) open-frame side panels instead of solid triangles (iter 2), (2) split back wall into pillars with open cable channel (iter 4-5), (3) fully open channel with just a top connecting bar (iter 5), (4) anti-slip ridges for functional detail (iter 9).

---

### Technique: Ramped Slot Tray with Angled Cavities
Keywords: tool organizer, screwdriver holder, angled slots, tool tray, bit holder, chisel rack, knife block, angled holder, tilted slot, ramp tray, tool caddy, plier rack

**When to use:** Any tray/holder where items sit in angled slots — screwdriver organizers, chisel racks, knife blocks, bit holders, plier racks. The key feature is slots that lean back at an angle so tools rest visibly and accessibly.

**What it is:** A trapezoidal-profile solid body (short front, tall back = ramp) created via polygon extrusion, combined with a flat section for small parts. Angled slot cavities are cut by rotating `cube()` cuts to match the ramp angle, then clipping with `intersection()` to prevent overflow through walls.

**Why ramp + rotated cuts:** A flat tray with vertical slots doesn't show the angle. Cylinder channels along the ramp are invisible from the top view. The winning approach: build the ramp body with `linear_extrude()` of a trapezoid polygon, then cut rectangular pockets that follow the ramp angle using `rotate([-ramp_angle, 0, 0])`. The `intersection()` with a simple bounding box prevents cuts from going through walls.

**Architecture:**
```
1. Trapezoidal body via linear_extrude(polygon) — creates the ramp
2. Flat section as a cube — for small parts compartments
3. intersection() with rbox() — rounds outer corners
4. Rotated cube slot cuts with bounding box intersection — angled pockets
5. Standard cube cavity cuts — flat compartments
```

**Proven code template:**
```openscad
$fn = 120;
total_w = 200;  total_d = 100;
wall = 3;  bottom = 3;  corner_r = 4;

// Ramp section
slot_section_w = 110;
slot_front_h = 18;  slot_back_h = 45;

// Flat section
flat_section_w = 90;  flat_section_h = 22;

div_t = 2.5;
num_slots = 7;  slot_w = 10;  slot_gap = 3;
total_slots_w = num_slots * slot_w + (num_slots - 1) * slot_gap;
slot_start_x = (slot_section_w - total_slots_w) / 2;
ramp_angle = atan2(slot_back_h - slot_front_h, total_d);
slot_cut_depth = 12;

module rbox(w, d, h, r) {
    hull() {
        translate([r, r, 0]) cylinder(r=r, h=h);
        translate([w-r, r, 0]) cylinder(r=r, h=h);
        translate([r, d-r, 0]) cylinder(r=r, h=h);
        translate([w-r, d-r, 0]) cylinder(r=r, h=h);
    }
}

module slot_section_body() {
    rotate([0, -90, 0])
        translate([0, 0, -slot_section_w])
            linear_extrude(height = slot_section_w)
                polygon(points = [
                    [0, 0], [0, total_d],
                    [slot_back_h, total_d], [slot_front_h, 0]
                ]);
}

module organizer() {
    difference() {
        intersection() {
            union() {
                slot_section_body();
                translate([slot_section_w, 0, 0])
                    cube([flat_section_w, total_d, flat_section_h]);
            }
            rbox(total_w, total_d, slot_back_h, corner_r);
        }
        // Angled slot pockets
        for (i = [0 : num_slots - 1]) {
            x_pos = slot_start_x + i * (slot_w + slot_gap);
            intersection() {
                translate([x_pos, wall, slot_front_h - slot_cut_depth])
                    rotate([-ramp_angle, 0, 0])
                        cube([slot_w, total_d / cos(ramp_angle),
                              slot_cut_depth + 50]);
                translate([x_pos - 1, wall, bottom + 1])
                    cube([slot_w + 2, total_d - 2*wall, slot_back_h]);
            }
        }
        // Flat compartment cavities
        translate([slot_section_w + div_t/2, wall, bottom])
            cube([flat_section_w*0.55 - wall - div_t/2,
                  total_d - 2*wall, flat_section_h]);
        translate([slot_section_w + flat_section_w*0.55 + div_t/2, wall, bottom])
            cube([flat_section_w*0.45 - wall - div_t/2,
                  total_d/2 - wall - div_t/2, flat_section_h]);
        translate([slot_section_w + flat_section_w*0.55 + div_t/2,
                   total_d/2 + div_t/2, bottom])
            cube([flat_section_w*0.45 - wall - div_t/2,
                  total_d/2 - wall - div_t/2, flat_section_h]);
    }
}
translate([-total_w/2, -total_d/2, 0]) organizer();
```

**Tuning the look:**
| Parameter | Effect |
|-----------|--------|
| `slot_front_h / slot_back_h` | Controls ramp steepness (15°-25° typical) |
| `num_slots` | Number of tool slots (5-10 typical) |
| `slot_w` | Slot width — 8-12mm for screwdrivers, 15-20mm for pliers |
| `slot_gap` | Divider thickness between slots (3-4mm) |
| `slot_cut_depth` | How deep the slot pocket goes (10-15mm) |
| `flat_section_w` | Width of small-parts area |

**How to adapt:**
| Type | Slot Width | Num Slots | Ramp Angle | Notes |
|------|-----------|-----------|------------|-------|
| Screwdriver tray | 10mm | 6-8 | 15° | Standard |
| Chisel rack | 15mm | 4-6 | 20° | Wider slots |
| Knife block | 5mm | 8-12 | 25° | Narrow, steep |
| Plier organizer | 20mm | 3-5 | 10° | Wide, shallow |
| Bit holder | 8mm | 10-15 | 15° | Many narrow slots |

**Pitfalls:**
- Cylinder channels along a ramp are invisible from top view — use rectangular pocket cuts instead
- Rotated cube cuts overflow through walls unless clipped — always use `intersection()` with a simple bounding `cube()`
- Complex polygon-profile bounding volumes for intersection clip everything — use a plain cube bounding box
- The ramp body must be created via `linear_extrude()` of a trapezoid polygon, NOT via stacked cubes
- `rotate([-ramp_angle, 0, 0])` applies to the cut cube, NOT to the slot section body
- Slots must start at `bottom + 1` minimum to keep floor intact
- Center slots in the section: `slot_start_x = (section_w - total_slots_w) / 2`

**Discovered:** Tool organizer tray retrain session, 10 iterations. Cylinder channels (iter 4-5) invisible from top. Rectangular pocket cuts with rotate (iter 6) was the breakthrough. Complex intersection clipping (iter 7) regressed — simple bounding box (iter 8) was the fix. Three-compartment flat section (iter 9) maximized utility.

---

This session confirmed the existing C-Clamp with Snap-In Channels technique (already in agent.md). The new discovery is:

### Visual Failure Table Additions:
| What You See | What's Wrong | Fix |
|-------------|-------------|-----|
| Clip looks like monolithic block | Clamp and cradle sections are same width | Make clamp section 3-6mm narrower than cradle (stepped width) |
| C-gap invisible from primary view | Gap faces away from camera | Rotate model so C-gap faces the front/iso viewing angle |
| Lip chamfer creates notch artifact | Rotated cube cut intersects poorly with lip geometry | Skip chamfers on thin lips, or use very conservative (< 1mm) chamfer |

### Pitfall additions to existing C-Clamp technique:
- **Stepped width discovery:** Making the clamp section narrower than the cradle section (3mm inset per side) immediately communicates the two-part function (clamp + holder). Without the step, front view looks like a solid block.
- **Orientation for recognizability:** The C-gap must face the primary viewing angle. If the back plate faces the camera, the clip nature is invisible. Use `rotate([0, 0, 180])` to flip if needed.
- **Both jaws should have lips:** Top lip extends downward, bottom lip extends upward. Two opposing lips provide better snap retention than one.
- **Lip chamfers are risky:** Rotated cube chamfer cuts on thin lips (< 3mm) create notch artifacts. The simple square lip profile is fine for 3D printing — the flex of the material provides the snap action.

---

### UPDATE to existing "Hex Grid Lattice with Circular Clip" technique:

The existing technique in agent.md is mostly correct but is **missing the critical `rotate([0,0,30])` on each hex cell**. Without this rotation, `cylinder($fn=6)` creates pointy-top hexagons that produce triangular gaps between cells instead of a proper honeycomb pattern.

**Required changes to existing technique:**

1. Add `rotate([0, 0, 30])` before each hex cylinder in the proven code template
2. Add to pitfalls: "Always rotate hex cells 30° with `rotate([0,0,30])` for flat-top orientation — without this, pointy-top hexagons create triangular gaps that look like Star of David pattern, not honeycomb"
3. Add to pitfalls: "Through-cuts are far more visually striking than pocket cuts — adding a solid floor under the hex grid makes the pattern invisible from the top view"
4. Update proven code template to include feet module for functional coasters

**Updated proven code template:**
```openscad
$fn = 80;
coaster_d = 100;  coaster_h = 4;  rim_h = 4;
border_w = 5.5;  chamfer = 0.8;
grid_r = 5;  wall = 1.6;
cell_r = grid_r - wall / sqrt(3);
clip_d = coaster_d - border_w * 2;

module hex_lattice() {
    intersection() {
        cylinder(h = coaster_h, d = clip_d);
        difference() {
            cylinder(h = coaster_h, d = coaster_d);
            for (q = [-10 : 10])
                for (r = [-10 : 10]) {
                    x = grid_r * sqrt(3) * (q + r / 2);
                    y = grid_r * 1.5 * r;
                    if (sqrt(x*x + y*y) < clip_d / 2 + cell_r)
                        translate([x, y, -1])
                            rotate([0, 0, 30])  // flat-top hex orientation
                                cylinder(h = coaster_h + 2, r = cell_r, $fn = 6);
                }
        }
    }
}

module rim_ring() {
    difference() {
        cylinder(h = coaster_h + rim_h, d = coaster_d);
        translate([0, 0, -1])
            cylinder(h = coaster_h + rim_h + 2, d = clip_d);
        translate([0, 0, coaster_h + rim_h - chamfer])
            difference() {
                cylinder(h = chamfer + 1, r = coaster_d / 2 + 1);
                cylinder(h = chamfer + 1, r1 = coaster_d / 2, r2 = coaster_d / 2 - chamfer);
            }
        translate([0, 0, -1])
            difference() {
                cylinder(h = chamfer + 1, r = coaster_d / 2 + 1);
                cylinder(h = chamfer + 1, r1 = coaster_d / 2 - chamfer, r2 = coaster_d / 2);
            }
    }
}

module feet() {
    foot_r = 3;  foot_h = 1;
    foot_offset = coaster_d / 2 - border_w / 2 - 2;
    for (i = [0 : 3])
        rotate([0, 0, i * 90 + 45])
            translate([foot_offset, 0, -foot_h])
                cylinder(h = foot_h, r = foot_r);
}

union() { hex_lattice(); rim_ring(); feet(); }
```

---

### Technique: Hull-Sphere Arch Bridge
Keywords: drawer pull, cabinet pull, handle, bridge handle, arch handle, towel bar, grab bar, door handle, bail pull, D-handle

**When to use:** Any arch-shaped bridge handle mounted at two points — cabinet pulls, drawer handles, towel bars, grab bars, door handles, bail pulls.

**What it is:** A hull chain of spheres along a parametric arch curve, connected to mounting rosettes via hull transitions. The arch profile uses a flattened power curve for a realistic flat-topped shape, and the handle radius tapers from thick at the mounting feet to thin at the arch center.

**Key insight — arch curve shape:**
```
// WRONG: sin() curve — too round/semicircular for hardware
z = post_h + rise * sin(t * 180);

// RIGHT: flattened power curve — flat top, steep sides like real pulls
z = foot_h + rise * pow(max(0, 1 - u*u), 0.4);  // u = 2*t - 1
```
The exponent (0.4) controls flatness: lower = flatter top, higher = rounder.

**Key insight — radius taper:**
```
// Thick at feet (foot_r=4.5), thin at center (handle_r=3)
r = handle_r + (foot_r - handle_r) * pow(abs(2*t - 1), 2.5);
```
The high exponent (2.5) keeps the center thin with a rapid thickening near the feet — looks like a real forged pull.

**Proven code template:**
```openscad
$fn = 120;
hole_spacing = 76;    // 76mm (standard 3" pull)
handle_rise = 15;
handle_r = 3;
foot_r = 4.5;
screw_d = 4;
rosette_h = 2.5;
rosette_r = 8;
foot_h = 5;

function arch_z(t) = let(u = 2*t - 1) foot_h + handle_rise * pow(max(0, 1 - u*u), 0.4);
function arch_r(t) = let(u = abs(2*t - 1)) handle_r + (foot_r - handle_r) * pow(u, 2.5);

module arch_handle() {
    segments = 20;
    for (i = [0 : segments - 1]) {
        hull() {
            let(t0 = i/segments, t1 = (i+1)/segments)
            translate([-hole_spacing/2 + t0*hole_spacing, 0, arch_z(t0)])
                sphere(r = arch_r(t0), $fn = 16);
            translate([-hole_spacing/2 + t1*hole_spacing, 0, arch_z(t1)])
                sphere(r = arch_r(t1), $fn = 16);
        }
    }
}

module mounting_foot() {
    difference() {
        cylinder(r = rosette_r, h = rosette_h);
        translate([0, 0, -1]) cylinder(d = screw_d, h = rosette_h + 2);
        translate([0, 0, -0.01]) cylinder(d1 = screw_d*2, d2 = screw_d, h = 2);
    }
}

module foot_transitions() {
    for (side = [-1, 1])
        hull() {
            translate([side*hole_spacing/2, 0, rosette_h])
                cylinder(r = rosette_r*0.55, h = 0.1);
            let(t = side == -1 ? 0 : 1)
            translate([-hole_spacing/2 + t*hole_spacing, 0, arch_z(t)])
                sphere(r = arch_r(t), $fn = 16);
        }
}

difference() {
    union() {
        for (side = [-1, 1])
            translate([side*hole_spacing/2, 0, 0]) mounting_foot();
        foot_transitions();
        arch_handle();
    }
    for (side = [-1, 1])
        translate([side*hole_spacing/2, 0, -1])
            cylinder(d = screw_d, h = foot_h + foot_r + 2);
}
```

**Standard hardware proportions:**
| Pull Size | hole_spacing | handle_rise | rosette_r |
|-----------|-------------|-------------|-----------|
| 3" (76mm) | 76 | 15-18 | 8 |
| 4" (102mm) | 102 | 18-22 | 8 |
| 5" (128mm) | 128 | 20-25 | 9 |
| 6" (160mm) | 160 | 22-28 | 10 |

**Pitfalls:**
- sin() arch → too round/semicircular for cabinet hardware. Use power curve.
- Separate cylinder posts → visible kink at handle junction. Use hull transitions.
- Screw holes extending through handle → visible cut from side. Only go through post zone.
- $fn > 16 on hull spheres → render timeout. $fn=16 is invisible at this scale.
- Uniform handle radius → looks like towel bar. Taper thick→thin from feet to center.
- Mounting screws go from behind drawer face — countersink on bottom of rosette, not top.

**Discovered:** Drawer pull session, 10 iterations. sin() curve too round (iter 0-2). Power curve (iter 3) was the breakthrough for arch shape. Eliminating separate posts via hull transitions (iter 6) solved the kink. Radius taper (iter 6+) made it look like real hardware, not a towel bar.

---

### Technique: Polar Cosine Star Profile
Keywords: star knob, knob, handwheel, wing nut, rosette, grip knob, clamping knob, lobe knob, thumb screw, star grip, cross knob

**When to use:** Any object with N rounded lobes radiating from a central hub — star knobs, handwheels, wing nuts, rosette handles, clamping knobs, cross grips, thumb screws with lobed heads.

**What it is:** Define the 2D cross-section as a polar curve `r(theta) = base_r + amp * (1 + cos(N*theta)) / 2`, then `linear_extrude()` to make the body. Add a tapered `cylinder()` at center for the boss, `difference()` for the center hole.

**Why it beats alternatives:**
- Hull-based lobes → narrow necks between lobes, not smooth concave valleys
- Individual lobe cylinders → flower shape, no concave valleys
- CSG cutting from a disc → difficult to get smooth rounded lobe tips
- **Polar cosine → smooth concave valleys + rounded lobe tips in one formula**

**The formula:**
```
r(theta) = base_r + amp * (1 + cos(N * theta)) / 2
```
- `base_r` = valley radius (minimum, between lobes)
- `amp` = how far lobes extend beyond valleys
- `N` = number of lobes (5 for star knob, 3 for tri-grip, 4 for cross knob)

**How to "dial in" different knob shapes:**
| Shape | N | base_r | amp | boss_extra | Notes |
|-------|---|--------|-----|------------|-------|
| Star knob (5-lobe) | 5 | 15 | 9 | 3 | Classic clamping knob |
| Cross knob | 4 | 12 | 10 | 3 | 4-arm grip |
| Tri-grip | 3 | 14 | 12 | 2 | 3-lobe handle |
| Handwheel | 3-5 | 20 | 8 | 5 | Larger, thinner lobes |
| Wing nut | 2 | 8 | 15 | 0 | 2 wings, no boss |

**Proven code template:**
```openscad
$fn = 120;
lobes = 5;
knob_h = 14;
base_r = 15;          // valley radius
amp = 9;              // lobe amplitude
hole_d = 8;           // threaded insert hole
boss_base_r = base_r; // matches valley for seamless blend
boss_top_r = 9;       // narrower at top
boss_extra = 3;       // boss height above knob surface

module star_profile() {
    steps = 360;
    polygon(points = [
        for (i = [0 : steps - 1])
            let(
                a = i * 360 / steps,
                lobe = (1 + cos(lobes * a)) / 2,
                r = base_r + amp * lobe
            )
            [r * cos(a), r * sin(a)]
    ]);
}

module knob_body() {
    linear_extrude(height = knob_h)
        star_profile();
    cylinder(h = knob_h + boss_extra, r1 = boss_base_r, r2 = boss_top_r);
}

difference() {
    knob_body();
    translate([0, 0, -1])
        cylinder(h = knob_h + boss_extra + 2, d = hole_d);
    translate([0, 0, knob_h + boss_extra - 0.5])
        cylinder(h = 1, d1 = hole_d, d2 = hole_d + 1.5);
    translate([0, 0, -0.01])
        cylinder(h = 0.6, d1 = hole_d + 1.5, d2 = hole_d);
}
```

**Tuning the look:**
| Parameter | Effect |
|-----------|--------|
| `lobes` | Number of grip points (2-8) |
| `base_r` | Valley depth — smaller = deeper grip |
| `amp` | Lobe prominence — larger = more defined lobes |
| `amp / base_r` ratio | > 0.5 = pronounced star, < 0.3 = subtle undulation |
| `boss_extra` | Boss height above star surface |
| `boss_top_r` | Boss taper — smaller = more tapered |
| `knob_h` | Overall thickness |

**Pitfalls:**
- Wrong cosine formula: `cos^2(N/2 * theta)` doubles the lobe count — always use `(1 + cos(N * theta)) / 2`
- Hull-based lobes create narrow necks, not smooth concave valleys
- Boss as separate straight cylinder looks disconnected — set boss_base_r = base_r for seamless transition at valley level
- Sphere intersection for top rounding clips unpredictably — flat top or gentle taper is safer
- Stacked profile domes need 20+ hull-slices to avoid staircase artifacts — often not worth the complexity
- For wing nuts (N=2), lobes are very long — reduce amp or increase base_r
- `steps = 360` in the polygon ensures smooth curves at $fn=120

**Discovered:** Star knob session, 10 iterations. Hull approach (iter 0-1) gave flower shape with narrow necks. Wrong cosine formula (iter 2) gave 6 lobes. Correct `(1+cos(5*theta))/2` (iter 3) was the breakthrough. Dome attempts (iter 4-6) were all regressions — flat top is the right call. Tapered boss with base_r matching valley (iter 8-9) gave clean seamless result.

---

The existing "Conical Revolution with Quadratic Spout Blend" technique in agent.md already covers the funnel body well. The new discovery is how to add a handle. This could be added as additional guidance within the existing technique:

### Addition to existing technique: Handle for Conical Bodies

**When to add:** Kitchen funnels, pour-over drippers, or any conical vessel that needs a grip handle.

**Pattern: Trapezoidal tab handle following cone surface**
```openscad
module handle() {
    handle_thick = 3;
    handle_extend_top = 22;  // wider at top
    handle_extend_bot = 12;  // narrower at bottom
    hole_r = 4.5;

    handle_z_top = total_h + 1;  // flush with rim
    handle_z_bot = handle_z_top - 24;
    steps = 10;

    difference() {
        // Hull-chain of thin cubes following the cone surface
        for (i = [0 : steps - 1]) {
            hull() {
                for (j = [i, i + 1]) {
                    t = j / steps;
                    z = handle_z_top - t * (handle_z_top - handle_z_bot);
                    cr = z > total_h ? mouth_r : cone_r_at(z);
                    ext = handle_extend_top + (handle_extend_bot - handle_extend_top) * t;
                    translate([cr - 1, -handle_thick/2, z])
                        cube([ext + 1, handle_thick, 0.5]);
                }
            }
        }
        // Hanging hole
        translate([hole_x, -handle_thick - 1, hole_z])
            rotate([-90, 0, 0])
                cylinder(h = handle_thick * 3, r = hole_r, $fn = 40);
    }
}
```

**Rules:**
- Handle top edge should be flush with or near the rim
- Use hull-chain of cubes (NOT spheres — spheres are 10x+ slower)
- Overlap inner edge with cone wall by 1-2mm to avoid gap
- Trapezoidal shape (wider at top, narrower at bottom) looks more natural than rectangular
- Hole cylinder must extend 3x handle thickness to avoid coincident-face artifacts
- 10 hull steps is sufficient for smooth surface following

---

### Technique: Grid Cavity Tray with Rounded Cube Pockets
Keywords: ice cube tray, mold, silicone mold, baking tray, candy mold, grid, cavity, pocket, rounded cube, compartment grid, chocolate mold, soap mold, resin mold, egg tray

**When to use:** Any tray or mold with a regular grid of identical cavities — ice cube trays, chocolate molds, candy molds, soap molds, baking trays, seed starter trays, parts organizers with uniform pockets.

**What it is:** A tapered solid body with a flat overhanging rim, hollowed by subtracting a grid of rounded-cube cavities. Each cavity uses `hull()` between 8 corner spheres (4 smaller at bottom, 4 larger at top) to create both the rounded-cube shape AND draft angle in one operation.

**Why hull-of-spheres beats alternatives:**
- `minkowski(cube, sphere)` is extremely slow with 12+ cavities
- Manual polygon points for rounded cubes are tedious and error-prone
- Hull of 8 spheres computes fast, gives perfect rounding, and the size difference between bottom and top spheres automatically creates draft angle

**Architecture:**
```
1. Tapered outer body (hull between smaller bottom rbox and larger top rbox)
2. Flat rim extending beyond body at top
3. Grid of rounded-cube cavities via difference()
4. Optional: subtle chamfer at cavity openings
```

**Proven code template:**
```openscad
$fn = 80;

cols = 4;  rows = 3;
cavity_top = 26;  cavity_bottom = 23;  cavity_depth = 20;
corner_r = 6;  wall = 2.5;  outer_wall = 3;  bottom = 3;
tray_corner_r = 5;  rim_overhang = 3;  rim_h = 2;  taper = 3;

tray_w = cols * cavity_top + (cols - 1) * wall + 2 * outer_wall;
tray_d = rows * cavity_top + (rows - 1) * wall + 2 * outer_wall;
tray_h = cavity_depth + bottom;

module rbox(w, d, h, r) {
    hull() {
        for (x = [r, w - r])
            for (y = [r, d - r])
                translate([x, y, 0]) cylinder(r = r, h = h);
    }
}

module tapered_body() {
    hull() {
        for (x = [tray_corner_r + taper, tray_w - tray_corner_r - taper])
            for (y = [tray_corner_r + taper, tray_d - tray_corner_r - taper])
                translate([x, y, 0]) cylinder(r = tray_corner_r, h = 0.01);
        for (x = [tray_corner_r, tray_w - tray_corner_r])
            for (y = [tray_corner_r, tray_d - tray_corner_r])
                translate([x, y, tray_h]) cylinder(r = tray_corner_r, h = 0.01);
    }
}

module draft_rcube_cavity(top_size, bot_size, depth, r) {
    bot_r = r * bot_size / top_size;
    bot_offset = (top_size - bot_size) / 2;
    hull() {
        for (x = [bot_offset + bot_r, bot_offset + bot_size - bot_r])
            for (y = [bot_offset + bot_r, bot_offset + bot_size - bot_r])
                translate([x, y, bot_r]) sphere(r = bot_r);
        for (x = [r, top_size - r])
            for (y = [r, top_size - r])
                translate([x, y, depth]) sphere(r = r);
    }
}

module ice_cube_tray() {
    difference() {
        union() {
            tapered_body();
            translate([-rim_overhang, -rim_overhang, tray_h - rim_h])
                rbox(tray_w + 2*rim_overhang, tray_d + 2*rim_overhang, rim_h, tray_corner_r + rim_overhang);
        }
        for (col = [0 : cols - 1])
            for (row = [0 : rows - 1])
                translate([outer_wall + col*(cavity_top+wall), outer_wall + row*(cavity_top+wall), bottom])
                    draft_rcube_cavity(cavity_top, cavity_bottom, cavity_depth + 1, corner_r);
    }
}

translate([-tray_w/2, -tray_d/2, 0]) ice_cube_tray();
```

**Tuning the look:**
| Parameter | Effect |
|-----------|--------|
| `corner_r` | Cavity rounding — 3mm = slightly rounded, 6mm = very rounded, 10mm+ = nearly spherical |
| `cavity_top - cavity_bottom` | Draft angle — 2-4mm difference is subtle, 6mm+ is very tapered |
| `wall` | Divider thickness — 2-3mm for silicone feel, 4mm+ for rigid plastic |
| `taper` | Outer wall taper — 3-4mm gives realistic tray shape |
| `rim_overhang` | Rim width — 2-4mm for subtle, 5mm+ for grab handle |
| `cols, rows` | Grid dimensions — works for any MxN grid |

**Adapting for different objects:**
| Object | corner_r | wall | Draft | Notes |
|--------|----------|------|-------|-------|
| Ice cube tray | 6 | 2.5 | 3mm | Classic rounded cubes |
| Chocolate mold | 8+ | 2 | 4mm | Deep rounding, more draft |
| Seed starter tray | 3 | 1.5 | 2mm | Square-ish cells, thin walls |
| Parts organizer | 2 | 3 | 1mm | Nearly square cells, thick walls |
| Egg carton | 10+ | 2 | 6mm | Nearly hemispherical cavities |

**Pitfalls:**
- Bottom sphere radius must be less than floor thickness — otherwise cavities punch through the bottom
- Chamfer at cavity openings must be < 0.5mm per side to avoid thinning divider walls
- `minkowski()` is too slow for 12+ cavities — always use hull + spheres
- Outer taper and cavity draft must be coordinated — outer walls can't taper more than the cavity draft
- Cavity cut must extend past top surface (`depth + 1`) to avoid z-fighting
- $fn < 60 makes sphere-based cavities look faceted

**Discovered:** Ice cube tray session, 10 iterations. Key discoveries: hull-of-spheres for rounded-cube cavities (iter 0-1), rim overhang for realism (iter 2), tapered outer body (iter 4), bottom punch-through from rounding spheres (iter 5 regression), opening chamfer proportions (iter 8-9).

---

### Technique: Radial Diamond Band Cutout
Keywords: napkin ring, diamond cutout, lattice band, decorative ring, perforated cylinder, cutout pattern, band pattern, bracelet, cuff, lampshade ring, candle sleeve, decorative sleeve, wine bottle ring

**When to use:** Any cylindrical band or ring with repeating diamond-shaped (or other geometric) cutout patterns — napkin rings, decorative sleeves, lampshade rings, candle holders with cutouts, decorative cuffs, wine bottle drip rings.

**What it is:** Build a hollow cylindrical band using `rotate_extrude()` with a polygon profile (for beveled edges), then `difference()` with diamond-shaped polygons extruded radially through the wall. Stagger alternating rows by half-pitch for a classic diamond lattice.

**Why polygon diamonds beat rotated cubes:** A rotated cube always produces a square cutout. To get elongated diamonds (taller than wide), you need a polygon with 4 points at different distances. The polygon approach gives full control over the diamond aspect ratio.

**Beveled band profile (better than plain cylinder):**
```openscad
rotate_extrude()
    polygon(points = [
        [ring_ir + bevel, 0],
        [ring_or - bevel, 0],
        [ring_or, bevel],
        [ring_or, ring_h - bevel],
        [ring_or - bevel, ring_h],
        [ring_ir + bevel, ring_h],
        [ring_ir, ring_h - bevel],
        [ring_ir, bevel]
    ]);
```

**Diamond cut module:**
```openscad
module diamond_cut(dh, dw) {
    linear_extrude(height = wall + 4, center = true)
        polygon(points = [
            [0, -dw],    // left point
            [dh, 0],     // top point
            [0, dw],     // right point
            [-dh, 0]     // bottom point
        ]);
}
```

**Placement pattern (staggered rows):**
```openscad
for (row = [0 : n_rows - 1]) {
    z_center = border + row_spacing * (row + 1);
    angle_offset = (row % 2) * (360 / n_cols / 2);
    for (col = [0 : n_cols - 1]) {
        rotate([0, 0, col * 360 / n_cols + angle_offset])
            translate([r_mid, 0, z_center])
                rotate([0, 90, 0])
                    diamond_cut(diamond_h, diamond_w);
    }
}
```

**Tuning the look:**
| Parameter | Effect |
|-----------|--------|
| `n_cols` | Diamonds around circumference — 10-14 typical for 50mm OD ring |
| `n_rows` | Vertical rows — 3-4 for 30mm band height |
| `diamond_h` | Vertical half-diagonal — larger = taller diamonds. Ratio dh:dw of 1.8:1 gives classic look |
| `diamond_w` | Tangential half-diagonal — smaller = narrower diamonds |
| `border` | Solid edge band — 3-4mm for structural integrity |
| `bevel` | Edge chamfer — 1-1.5mm for polished look |
| `row_spacing` | Auto-calculated: `(ring_h - 2*border) / (n_rows + 1)` |

**Typical napkin ring proportions:**
- OD: 45-55mm (fits standard napkins)
- ID: OD - 6mm (3mm wall thickness)
- Height: 25-35mm
- Wall thickness: 2.5-3.5mm (thinner = more delicate but fragile)

**Pitfalls:**
- Rotated cube = square cutout, not diamond. Use polygon for elongated shapes.
- `scale()` on rotated cube distorts unpredictably — always use polygon for aspect ratio control
- Place diamond cuts at wall midpoint `r_mid = (OR + IR) / 2`, not outer surface
- Extrude height `wall + 4` ensures clean through-cuts
- Keep border >= 3mm at top/bottom for structural integrity
- Space diamonds so >= 2mm material remains between tips
- Polygon points exactly on body vertices → non-manifold. Offset by 0.01mm if needed.

**Discovered:** Napkin ring session, 10 iterations. Rotated cubes made squares (iter 0-5); polygon diamond cuts gave proper elongated shape (iter 6+). Non-manifold from polygon-body coincidence fixed by slight point inset (iter 8).

---

### Technique: Flat Panel with Hole Grid
Keywords: pegboard, panel, plate, grid, hole pattern, perforated, faceplate, mounting plate, bracket plate, PCB, drilled plate

**When to use:** Any flat panel with a regular pattern of holes — pegboards, faceplates, mounting plates, perforated panels, PCB mounting boards, ventilation grilles with round holes.

**What it is:** A rounded-rectangle panel (hull of 4 corner cylinders) with `difference()` to cut grids of cylindrical holes. Different hole types (functional vs mounting) use different diameters and countersinks.

**Pattern:**
```openscad
$fn = 60;

module rounded_rect(w, h, t, r) {
    hull() {
        for (x = [r, w - r])
            for (y = [r, h - r])
                translate([x, y, 0])
                    cylinder(h = t, r = r);
    }
}

difference() {
    // Panel body
    rounded_rect(panel_w, panel_h, panel_t, corner_r);

    // Regular grid of holes — centered on panel
    grid_w = (cols - 1) * spacing;
    grid_h = (rows - 1) * spacing;
    x0 = (panel_w - grid_w) / 2;
    y0 = (panel_h - grid_h) / 2;

    for (c = [0 : cols - 1])
        for (r = [0 : rows - 1])
            translate([x0 + c * spacing, y0 + r * spacing, -1])
                cylinder(h = panel_t + 2, d = hole_d);

    // Mounting holes with countersink
    for (x = [inset, panel_w - inset])
        for (y = [inset, panel_h - inset]) {
            translate([x, y, -1])
                cylinder(h = panel_t + 2, d = mount_d);
            translate([x, y, panel_t - cs_depth])
                cylinder(h = cs_depth + 1, d1 = mount_d, d2 = cs_d);
        }
}
```

**Key dimensions:**
| Parameter | Typical value | Notes |
|-----------|--------------|-------|
| panel_t | 3-6mm | Thicker = more rigid |
| corner_r | 3-5mm | Rounded corners |
| hole_d | 6mm | Standard pegboard hole |
| spacing | 25mm | Standard pegboard pitch |
| mount_d | 4-5mm | Mounting screw hole |
| mount_cs_d | 8-10mm | Countersink — must be larger than mount_d |
| mount_inset | 7-10mm | Distance from edge to mounting hole |

**Pitfalls:**
- Sharp corners look unrealistic — always use hull() rounded rectangle
- Mounting holes same diameter as grid holes are indistinguishable — use smaller diameter + countersink
- Don't hand-compute margins — use `(panel_dim - (count-1)*spacing) / 2` for centered grid
- Standard 25mm spacing looks more natural than arbitrary values
- Countersink cone: `d1=small` (bottom), `d2=large` (top) — tapers outward from below
- Raised borders and edge chamfers add complexity without visual payoff at panel scale
- Always cut holes with `h = panel_t + 2` and start at `z = -1` to avoid z-fighting

**Discovered:** Pegboard panel session, 10 iterations. Sharp corners → rounded → countersunk → standardized spacing.

---

### Technique: Threaded Bottle Cap
Keywords: bottle cap, cap, lid, thread, threaded, screw cap, knurl, knurled, closure

**When to use:** Any screw-on cap or lid with a threaded interior and textured grip exterior.

**What it is:** A hollow cylinder closed on one end (top) with vertical knurl ridges on the outside and a helical thread ridge on the inside, built via hull-chained shapes along a helical path.

**Architecture:**
1. Hollow cylinder body (difference of two cylinders)
2. Vertical triangular ridges via `linear_extrude()` of triangle polygons around circumference
3. Internal helical thread via hull chain of small shapes on helical path
4. Optional cutaway to reveal interior for display

**Key decisions:**
- Use **straight vertical ridges** (not diamond knurl) for bottle caps — diamond knurl via helical intersection looks messy at small scale and compiles slowly
- Thread via hull chain of 4 spheres per segment (inner wall + ridge tip × 2 adjacent angles)
- 72-90 segments for smooth thread, $fn=6-8 per sphere for speed
- Cutaway via `difference()` with a cube to show interior features

**Pitfalls:**
- Diamond knurl (helical intersection) looks like artifacts at bottle cap scale — use vertical ridges
- Internal features invisible from standard camera angles — use cutaway
- Too many ridges (>30) with intersection() causes 2+ min compile times
- Thread needs trapezoidal cross-section (wider at wall, narrower at tip) for realism
- Cap height:diameter ratio should be ~0.7-0.9 for realistic bottle cap proportions

---

### Technique: Flat Relief Coin (coins, medals, tokens)
**When to use:** Flat disc objects with raised surface details — coins, medals, tokens, medallions, badges, emblems.

**Classification:** CSG Primitives (flat body + raised features)

**Core approach:**
1. Flat cylinder body (3mm thick for 40mm coin)
2. Raised rim rings on both faces via difference(larger_cyl, smaller_cyl)
3. Star via polygon with alternating outer/inner radii, linear_extrude on top
4. Text via individual characters placed around a circle with rotate+translate

**Key dimensions:**
- Coin thickness: ~7-8% of diameter
- Rim width: ~4% of diameter
- Rim height: ~20% of thickness
- Star outer radius: ~40-50% of coin radius
- Star inner radius: ~40% of outer radius
- Text radius: coin_r - rim_w - 1.5

**Pitfalls:**
- Text geometry creates triangulation artifacts on flat surfaces — unavoidable in OpenSCAD CSG
- Text readability from top view is inconsistent — scorer may perceive it as mirrored
- Avoid sphere-based decorative elements (beaded edges) — extremely slow compilation
- Avoid rotate_extrude edge rings — adds visual artifacts
- Keep raised feature heights modest (0.5-1.0mm) — too tall looks unnatural

---

### Technique: Helical Hull-Chain (springs, coils, helixes)

**When to use:** Any object with a helical/spiral wire path — compression springs, tension springs, coil elements, spiral staircases, threaded rods.

**Classification:** Does the object have a wire/rod following a helical path? → Helical Hull-Chain

**Core idea:** Parametric helix defined by (angle, z) pairs placed along a circular path, with hull() connecting adjacent spheres to form a continuous wire body.

**Template:**
```openscad
coils = 8;          // number of coils
outer_r = 10;       // outer radius of spring
height = 40;        // total height
wire_r = 1;         // wire radius
pitch = height / coils;
segs_per_coil = 30; // segments per revolution

total_segs = coils * segs_per_coil;

for (i = [0 : total_segs - 1]) {
    hull() {
        for (j = [0, 1]) {
            angle = (i + j) * 360 / segs_per_coil;
            z = (i + j) * pitch / segs_per_coil;
            cr = outer_r - wire_r;
            translate([cr * cos(angle), cr * sin(angle), z])
                sphere(r = wire_r, $fn = 12);
        }
    }
}
```

**Pitfalls:**
| What Goes Wrong | Why | Fix |
|----------------|-----|-----|
| Compile takes 10+ minutes | $fn too high on hull spheres | Use $fn=12 for spheres in hull chain |
| Wire looks polygonal | Too few segments per coil | Use 30+ segs_per_coil |
| Spring wider than specified | Used outer_r as coil center | Coil center = outer_r - wire_r |
| Spring looks like solid cylinder | Wire too thick relative to pitch | Keep wire_d < pitch/2 |

---

### Technique: Hull-Chain J-Hook with Mounting Plate
Keywords: hook, coat hook, wall hook, hanger, J-hook, mounting plate, wall mount, screw holes, hat hook, towel hook

**When to use:** Wall-mounted hooks and hangers — any object with a flat plate against a wall and a curved hook extending outward.

**What it is:** A vertical rounded-rectangle plate with screw holes, plus a hull-chain curved hook. The plate sits in the XZ plane (wall), the hook extends in Y (away from wall) then curves down in a J-shape.

**Pattern:**
```openscad
$fn = 60;

plate_w = 35; plate_h = 70; plate_t = 4; corner_r = 3;
hook_r = 5; hook_curve_r = 20; arm_len = 35;
hook_attach_z = 45; hook_sweep = 230;

// Vertical plate
module plate() {
    hull() {
        for (x = [corner_r, plate_w - corner_r])
            for (z = [corner_r, plate_h - corner_r])
                translate([x, 0, z])
                    rotate([-90, 0, 0])
                        cylinder(h = plate_t, r = corner_r);
    }
}

// J-hook via hull chain
module hook() {
    cx = plate_w / 2;
    // Straight arm
    translate([cx, plate_t, hook_attach_z])
        rotate([-90, 0, 0])
            cylinder(h = arm_len, r = hook_r);
    // J-curve
    n_steps = 24;
    for (i = [0 : n_steps - 1]) {
        a1 = 90 - i * (hook_sweep / n_steps);
        a2 = 90 - (i + 1) * (hook_sweep / n_steps);
        hull() {
            translate([cx, plate_t + arm_len + hook_curve_r * cos(a1),
                       hook_attach_z + hook_curve_r * sin(a1)])
                rotate([0, 90, 0])
                    cylinder(h = 0.1, r = hook_r, center = true);
            translate([cx, plate_t + arm_len + hook_curve_r * cos(a2),
                       hook_attach_z + hook_curve_r * sin(a2)])
                rotate([0, 90, 0])
                    cylinder(h = 0.1, r = hook_r, center = true);
        }
    }
}

difference() {
    union() { plate(); hook(); }
    // Screw holes with countersink
    for (z_off = [10, 60]) {
        translate([plate_w/2, -1, z_off])
            rotate([-90, 0, 0])
                cylinder(h = plate_t + 2, d = 5);
        translate([plate_w/2, plate_t + 0.01, z_off])
            rotate([90, 0, 0])
                cylinder(h = 2, d1 = 5, d2 = 10);
    }
}
```

**Pitfalls:**
- Plate must be vertical (XZ plane) for wall-mounted objects — horizontal plate looks like a tray
- Use thin cylinders (`h=0.1`) not spheres for hull chains — spheres at $fn=60+ take minutes to compile
- Hook sweep must be 230°+ for functional J-shape — 180° is just a semicircle with no retention
- Arm length 30-40mm minimum — shorter looks like a stub, not a functional hook
- Place screw holes symmetrically far from hook attachment to keep them visible in renders

---

### Technique: Radial Teardrop Cutout Pattern
Keywords: candle holder, teardrop, cutout, pattern, lantern, decorative sleeve, lamp shade, cylinder cutout, pierced, perforated, luminaire, hurricane lamp, candle sleeve, tea light holder

**When to use:** Any cylindrical object with repeating teardrop-shaped (or other organic-shaped) cutout patterns around the sides — candle holders, lanterns, decorative sleeves, lamp shades, pierced cylinders.

**What it is:** Hollow cylinder body via `rotate_extrude()` with a beveled polygon profile, combined with teardrop-shaped polygon cutouts extruded radially through the wall and arranged in staggered rows via `difference()`.

**Why this approach beats alternatives:**
- Hull of sphere + tiny sphere creates proper teardrops but is extremely slow at high $fn with many cutouts
- Rotated cubes only produce diamonds/squares, not teardrops
- Complex rotation chains to orient the 2D shape are error-prone — a single `rotate([90,0,0])` correctly maps polygon Y (height) to world Z (vertical)

**The teardrop polygon:**
A teardrop is simply: pointed tip at top, straight lines down to the widest point, then a semicircle around the bottom. Three elements, one polygon:
```
tip (0, tip_y)  →  right side of circle (r, cy)  →  semicircle around bottom  →  left side (-r, cy)  →  back to tip
```

**Orientation trick (critical):**
The 2D polygon is defined in XY (X=width, Y=height). After `linear_extrude` the shape extends along Z. To place it vertically on a cylinder wall:
- `rotate([90, 0, 0])` maps: X→X (tangential), Y→Z (vertical), Z→-Y (radial)
- `translate([0, r_mid, z_center])` positions at wall midpoint
- `rotate([0, 0, col_angle])` distributes around the cylinder

**Proven code template:**
```openscad
$fn = 120;

holder_od = 70;  holder_id = 64;  holder_h = 100;
wall = (holder_od - holder_id) / 2;
base_h = 5;  bevel = 1.5;  candle_d = 40;
n_cols = 8;  n_rows = 3;  border = 14;
tear_total_h = 20;  tear_circle_r = 5;

module body() {
    or = holder_od / 2;  ir = holder_id / 2;
    rotate_extrude()
        polygon(points = [
            [ir + bevel, 0], [or - bevel, 0], [or, bevel],
            [or, holder_h - bevel], [or - bevel, holder_h],
            [ir + bevel, holder_h], [ir, holder_h - bevel],
            [ir, base_h], [candle_d/2, base_h], [candle_d/2, 0], [ir + bevel, 0]
        ]);
}

module teardrop_2d() {
    r = tear_circle_r;
    cy = -tear_total_h / 2 + r;
    tip_y = tear_total_h / 2;
    polygon(points = concat(
        [[0, tip_y]],
        [for (a = [0 : -5 : -180]) [r * cos(a), cy + r * sin(a)]]
    ));
}

module teardrop_cuts() {
    row_spacing = (holder_h - 2 * border) / (n_rows + 1);
    r_mid = (holder_od + holder_id) / 4;
    ext_h = wall + 4;
    for (row = [0 : n_rows - 1]) {
        z_center = border + row_spacing * (row + 1);
        angle_offset = (row % 2) * (360 / n_cols / 2);
        for (col = [0 : n_cols - 1]) {
            a = col * 360 / n_cols + angle_offset;
            rotate([0, 0, a])
                translate([0, r_mid, z_center])
                    rotate([90, 0, 0])
                        linear_extrude(height = ext_h, center = true)
                            teardrop_2d();
        }
    }
}

difference() { body(); teardrop_cuts(); }
```

**Tuning:**
| Parameter | Effect |
|-----------|--------|
| `n_cols` | Cutouts per row — 6-10 for 70mm OD |
| `n_rows` | Vertical rows — 2-4 depending on height |
| `tear_total_h` | Teardrop height — 15-25mm |
| `tear_circle_r` | Bottom circle radius — tear_total_h * 0.25-0.3 |
| `border` | Solid band at top/bottom — 10-15mm |
| `bevel` | Edge chamfer on cylinder — 1-2mm |
| Row stagger | `(row % 2) * half_pitch` for classic offset pattern |

**Pitfalls:**
- `rotate([0,90,0])` puts teardrop height horizontal — use `rotate([90,0,0])` instead
- Hull of spheres is too slow for many cutouts — use polygon extrusion
- Rotated cubes produce squares/diamonds, not teardrops
- Quadratic/power curves for the taper create angular shapes — straight lines from circle to tip are cleaner
- Always extrude `wall + 4` to ensure clean through-cuts
- Position cuts at wall midpoint `r_mid = (OD + ID) / 4`, not at outer surface
- Keep `border >= 10mm` at top/bottom for structural integrity
- Fewer points in polygon arc (step of 5°) compile faster while still looking smooth

**Discovered:** Candle holder session, 6 iterations. Key breakthrough: single `rotate([90,0,0])` for correct vertical orientation (iter 5). Failed approaches: hull-spheres (too slow), rotated cubes (wrong shape), complex rotation chains (wrong orientation), quadratic curves (angular shapes).

---

### Technique: CSG Wedge with Arch Handle
Keywords: door stop, wedge, doorstop, door wedge, grip handle, stopper, ramp, chock

**When to use:** Wedge-shaped objects with a grip handle — door stops, wheel chocks, ramps with handles.

**What it is:** A tapered wedge body built via `hull()` between thin front and tall back slices, with a hull-chain arch handle positioned on the sloped surface.

**Architecture:**
```
1. Wedge body: hull() of front thin slice + back tall slice
2. Arch handle: hull-chain of spheres along power curve, z offset by wedge_z(x)
3. Optional: bottom ridges for grip
```

**Proven code template:**
```openscad
$fn = 120;
wedge_length = 100;
wedge_width = 40;
wedge_height = 30;
wedge_thin = 2;
handle_rise = 25;
handle_r = 5;
handle_span = 45;

module wedge_body() {
    hull() {
        translate([0, 0, 0]) cube([wedge_thin, wedge_width, 0.01], center=false);
        translate([0, 0, 0]) cube([0.01, wedge_width, wedge_thin], center=false);
        translate([wedge_length - 0.01, 0, 0]) cube([0.01, wedge_width, wedge_height], center=false);
    }
}

module grip_handle() {
    segments = 16;
    handle_center_x = wedge_length * 0.65;
    handle_y = wedge_width / 2;
    function wedge_z(x) = wedge_thin + (wedge_height - wedge_thin) * (x / wedge_length);

    for (i = [0 : segments - 1]) {
        t0 = i / segments;
        t1 = (i + 1) / segments;
        x0 = handle_center_x - handle_span/2 + t0 * handle_span;
        x1 = handle_center_x - handle_span/2 + t1 * handle_span;
        u0 = 2 * t0 - 1;
        u1 = 2 * t1 - 1;
        z0 = wedge_z(x0) + handle_rise * pow(max(0, 1 - u0*u0), 0.4);
        z1 = wedge_z(x1) + handle_rise * pow(max(0, 1 - u1*u1), 0.4);
        r0 = handle_r * (0.75 + 0.25 * pow(abs(u0), 2));
        r1 = handle_r * (0.75 + 0.25 * pow(abs(u1), 2));
        hull() {
            translate([x0, handle_y, z0]) sphere(r = r0, $fn = 16);
            translate([x1, handle_y, z1]) sphere(r = r1, $fn = 16);
        }
    }
}

union() {
    wedge_body();
    grip_handle();
}
```

**Pitfalls:**
- Solid fin/ridge handle → scorer wants arch/loop handle you can grip with fingers
- Handle cross-section too thin (<4mm radius) → looks fragile, not grippable
- Handle not following wedge slope → floats or sinks into surface
- sin() arch too round → use `pow(1-u², 0.4)` for flat-topped shape
- Handle centered on wedge (50%) → put at 65% back where wedge is thicker

---

### Technique: Elongated CSG Assembly with Arched Clip
Keywords: pen, pencil, marker, stylus, wand, baton, tube with clip, capped cylinder, writing instrument

**When to use:** Any elongated cylindrical object with a removable cap and/or pocket clip — pens, markers, styluses, capped tubes.

**What it is:** A union of cylinders (body, tapered tip cone, hollow cap with dome) plus a hull-chained arched clip. The cap is offset from the body by a visible gap. Decorative rings (thin wider cylinders) add detail cheaply.

**Decomposition pattern:**
1. **Body** — main cylinder, full length
2. **Tapered tip** — cone (cylinder with r1 < r2) at the bottom
3. **Grip section** — slightly wider cylinder near tip + decorative ring
4. **Cap** — hollow cylinder (difference of two cylinders) with dome top (scaled sphere), offset by gap_z from body top
5. **Pocket clip** — hull-chained cubes along sinusoidal arch, attached to cap side
6. **Decorative bands** — thin wider cylinders for visual detail

**Key dimensions:**
| Parameter | Guideline |
|-----------|-----------|
| `body_len` | 100-120mm for realistic pen length |
| `body_r` | 4-6mm |
| `tip_len` | 15-20mm |
| `cap_len` | 30-40mm (~30% of body) |
| `cap_r` | body_r + 1mm (must be visibly wider) |
| `cap_gap` | 2-3mm (visible separation) |
| `clip_len` | 35-45mm |
| `clip_w` | 4-6mm |
| `clip_t` | 1.5-2mm |

**Pitfalls:**
- Clip thickness < 1.5mm looks wire-like — use cubes not cylinders for clip cross-section
- Cap same radius as body → looks integrated, not removable. Make cap 1mm+ wider.
- No gap between body and cap → reads as one piece. Use 2-3mm gap.
- Clip without arch looks like a flat stick — use sin() path for natural spring shape
- Cap dome via sphere must be `scale([1,1,0.5])` or it looks like a ball on top
- Add rim ring at cap base for clear cap-body boundary

**Discovered:** Pen body training, 3 iterations. Key breakthroughs: (1) visible gap between body and cap for distinctness (iter 1), (2) thicker wider clip with sinusoidal arch (iter 2), (3) decorative bands and rim rings for realism (iter 2).

---

### Technique: Lip-and-Groove Stacking Interface
Keywords: stackable, stacking, nesting, interlocking, lip, groove, channel, bin, storage bin, crate, tote, stackable bin, nesting bin

**When to use:** Any container that needs to stack securely with interlocking features — storage bins, crates, totes, stackable trays, nesting boxes.

**What it is:** A rectangular bin with two key features: (1) an outward-protruding lip ridge at the top rim, and (2) a U-shaped groove channel around the bottom formed by an outer skirt wall and the body wall extending downward. When stacked, the lip of one bin fits snugly into the groove of the bin above.

**Architecture:**
```
1. Main body: rbox() rounded rectangle
2. Top lip: wider rbox() at top (protrudes lip_out outward)
3. Bottom groove: body extends down as inner wall + outer skirt wall + channel cut between them
4. Hollow interior via difference()
5. Hollow skirt interior so bottom isn't solid
```

**Proven code template:**
```openscad
$fn = 120;
bin_w = 120; bin_d = 80; bin_h = 55;
wall = 3; bottom = 3; corner_r = 5;
lip_h = 5; lip_out = 2.5;
groove_gap = 3; skirt_h = 7; skirt_wall = 2;

module rbox(w, d, h, r) {
    hull() {
        translate([r, r, 0]) cylinder(r=r, h=h);
        translate([w-r, r, 0]) cylinder(r=r, h=h);
        translate([r, d-r, 0]) cylinder(r=r, h=h);
        translate([w-r, d-r, 0]) cylinder(r=r, h=h);
    }
}

module bin() {
    total_ext = lip_out + groove_gap + skirt_wall;
    difference() {
        union() {
            rbox(bin_w, bin_d, bin_h, corner_r);
            translate([-lip_out, -lip_out, bin_h])
                rbox(bin_w + 2*lip_out, bin_d + 2*lip_out, lip_h, corner_r + lip_out);
            translate([0, 0, -skirt_h])
                rbox(bin_w, bin_d, skirt_h + 0.01, corner_r);
            translate([-total_ext, -total_ext, -skirt_h])
                rbox(bin_w + 2*total_ext, bin_d + 2*total_ext, skirt_h + 0.01, corner_r + total_ext);
        }
        // Groove channel
        translate([-lip_out - groove_gap, -lip_out - groove_gap, -skirt_h + bottom])
            difference() {
                rbox(bin_w + 2*(lip_out + groove_gap), bin_d + 2*(lip_out + groove_gap),
                     skirt_h + 1, corner_r + lip_out + groove_gap);
                translate([groove_gap + lip_out, groove_gap + lip_out, -0.5])
                    rbox(bin_w, bin_d, skirt_h + 2, corner_r);
            }
        // Hollow interior
        translate([wall, wall, bottom])
            rbox(bin_w - 2*wall, bin_d - 2*wall, bin_h + lip_h + 1, max(corner_r - wall, 1));
        // Hollow skirt
        translate([wall, wall, -skirt_h - 0.5])
            rbox(bin_w - 2*wall, bin_d - 2*wall, skirt_h + bottom + 1, max(corner_r - wall, 1));
    }
}
translate([-bin_w/2, -bin_d/2, 0]) bin();
```

**Sizing guidelines:**
| Parameter | Guideline |
|-----------|-----------|
| `lip_out` | 2.5-4mm outward protrusion |
| `lip_h` | 4-6mm lip height |
| `groove_gap` | 3-5mm channel width (>lip_out for clearance) |
| `skirt_h` | 7-10mm total skirt depth |
| `skirt_wall` | 2-2.5mm outer skirt wall thickness |
| `wall` | 3mm main body wall |

**Pitfalls:**
- Groove too wide makes bin look like it's sitting on a tray — keep total_ext < 10mm
- Groove too narrow makes it invisible in renders
- Must hollow skirt interior or bottom becomes a solid block
- Use 0.01 overlap on skirt heights to prevent z-fighting
- Don't forget groove floor (bottom parameter in groove cut position)
- If using draft/taper on main body, groove dimensions must match tapered profile

**Discovered:** Stackable bin session, 6 iterations. Peaked at 7/10. Key challenge is balancing visibility of interlocking features (scorer needs to see them) vs proportional integration (too wide looks like a tray). Best results with moderate groove gap (3-5mm) and visible but not excessive outer skirt.

---

### Technique: Hull-of-Scaled-Spheres for Flat Objects
Keywords: pick, flat, thin, token, badge, shim, plectrum, wedge, tapered

**When to use:** Any flat/thin object that needs a smooth 2D outline with varying thickness across the surface (guitar picks, shims, wedges, tokens, badges).

**Why this works:** `hull()` of `resize()`d spheres creates a smooth convex shape where each sphere independently controls: (1) position via `translate`, (2) corner rounding via XY dimensions of `resize`, and (3) local thickness via Z dimension of `resize`. The hull interpolates smoothly between all these parameters.

**Core pattern:**
```openscad
$fn = 120;

// Place one sphere per corner/control point
// resize([corner_radius*2, corner_radius*2, local_thickness])
hull() {
    translate([x1, y1, t1/2])
        resize([r1*2, r1*2, t1]) sphere(d = 1);
    translate([x2, y2, t2/2])
        resize([r2*2, r2*2, t2]) sphere(d = 1);
    translate([x3, y3, t3/2])
        resize([r3*2, r3*2, t3]) sphere(d = 1);
}
```

**Design rules:**
- Center each sphere at Z = local_thickness/2 so bottom face sits on Z=0
- Use larger corner radii (7mm+) for rounded corners, smaller (2-3mm) for sharper points
- Slight elongation toward one vertex creates natural pick/teardrop feel
- $fn=120 is critical — flat surfaces show facets at lower values

**Pitfalls:**
- Tip radius too small (< 2mm) → looks like a teardrop, not a rounded triangle
- All radii equal + equilateral vertices → looks too geometric, not like a real pick
- Forgetting to center sphere at t/2 → bottom face not flat

---

### Technique: Side-by-Side Paired Vessels
Keywords: plant pot, planter, saucer, drainage, side by side, matching, pair, set, cup and saucer, bowl and plate

**When to use:** Any prompt requesting two related vessels displayed together (pot + saucer, cup + plate, bowl + lid side by side).

**What it is:** Two independent bezier-profile revolutions positioned with `translate()`, where one object has CSG details (drainage holes, handles) and the other is a simpler matching piece.

**Core approach:**
1. Model each vessel as a separate module using bezier profile revolution
2. Use `difference()` on the primary object for functional details (drainage holes, vents)
3. Size the secondary piece proportionally (saucer radius ≈ pot base radius + 10-15%)
4. Position side by side with `translate()` — offset = max_radius_A + max_radius_B + gap

**Key sizing rules:**
- Saucer outer radius = pot rim radius + 4-6mm
- Saucer height = 12-15% of pot height
- Drainage holes: 1 center (r=4) + 5 ring (r=3.5) at ~55% of base radius
- Gap between objects: 5-10mm

**Pitfalls:**
- Drainage holes that don't fully penetrate (start at z=-1, extend past foot height)
- Saucer too large or too small relative to pot
- Objects overlapping because offset is too small
- Saucer looking like a flat disc instead of a dish (needs raised inner floor)

---

### Technique: Linear Extrude Profile Channel
Keywords: gutter, channel, rail, trough, U-profile, C-channel, molding, extrusion, lip, flange, mounting, bracket

**When to use:** Any object that is fundamentally a 2D cross-section extruded along a straight line — gutters, rails, channels, moldings, structural profiles (C-channel, L-bracket, T-bar, I-beam).

**Core approach:**
1. Design the 2D cross-section using `square()`, `circle()`, `polygon()` and CSG operations
2. Use `difference()` to create hollow sections (U-channels, C-channels)
3. Use additional `square()` shapes for lips, flanges, mounting tabs
4. `linear_extrude(height = length)` to sweep into 3D
5. `rotate([90, 0, 0])` to orient so profile is visible from front view

**Proven code template:**
```openscad
$fn = 120;
length = 100;
width = 70;
depth = 35;
wall_t = 2.5;
lip_w = 10;
lip_t = 1.5;

module profile() {
    // Hollow U-channel
    difference() {
        square([width, depth]);
        translate([wall_t, wall_t, 0])
            square([width - 2*wall_t, depth + 1]);
    }
    // Mounting lips
    translate([-lip_w, depth - lip_t, 0])
        square([lip_w + 0.01, lip_t]);
    translate([width - 0.01, depth - lip_t, 0])
        square([lip_w + 0.01, lip_t]);
}

translate([-width/2, 0, 0])
rotate([90, 0, 0])
translate([0, 0, -length/2])
linear_extrude(height = length)
    profile();
```

**Pitfalls:**
- Default extrusion along Z makes front view show a solid rectangle — rotate to Y-axis
- Use thin lips (1-2mm) relative to wall thickness (2-3mm) for realistic proportions
- Inner cavity must extend past outer boundary for clean boolean subtraction
- Use 0.01mm overlaps at lip-to-wall junctions to prevent z-fighting
- For curved bottoms (realistic gutters), replace sharp corners with arc polygons

**Discovered:** Rain gutter session, 2 iterations. Reached 8/10. Key insight was orientation — rotating the extrusion so the profile cross-section faces the front camera dramatically improved scorer perception.

---

### Technique: Slotted Tray CSG
**Use when:** The object is a flat tray, dish, or plate with drainage holes/slots (soap dish, drip tray, drying rack base)

**Classification:** CSG Primitives

**Core approach:**
1. Build outer shell as rounded rectangle (hull of 4 corner cylinders)
2. Hollow interior with difference() using same shape offset by wall thickness
3. Cut drainage slots as elongated holes (hull of two small cylinders) through the floor
4. Slots should be parallel, evenly spaced, and cover ~70% of the inner floor area

**Key parameters:**
- `dish_height`: 15-25mm for typical soap dish
- `floor_thickness`: 3-5mm (slots cut through this)
- `slot_width`: 2-4mm (hull of two cylinders with r = slot_width/2)
- `slot_length`: ~70% of inner length for good coverage
- `corner_r`: 10-15mm for smooth rounded rectangle corners

**Template:**
```openscad
$fn = 120;
module rounded_rect(l, w, h, r) {
    hull() {
        for (x = [-l/2 + r, l/2 - r])
            for (y = [-w/2 + r, w/2 - r])
                translate([x, y, 0]) cylinder(r = r, h = h);
    }
}
difference() {
    rounded_rect(120, 80, 20, 12);
    translate([0, 0, 4])
        rounded_rect(114, 74, 20, 9);
    for (i = [0:8]) {
        y = -28 + i * 7;
        translate([0, y, -1])
            hull() { for (x = [-40, 40]) translate([x, 0, 0]) cylinder(r = 1.5, h = 6); }
    }
}
```

**Pitfalls:**
- Slots too short look like they only cover center — extend to 70%+ of inner length
- Too few rows of slots looks sparse — use spacing of 6-8mm
- Dish too shallow (<15mm) makes raised edges invisible from side view
- Floor too thin (<3mm) won't print well; too thick (>6mm) looks chunky

---

### Technique: Cylindrical Well Grid with Contact Slots
Keywords: battery holder, battery case, AA holder, AAA holder, cell holder, battery tray, battery compartment, pen holder, marker holder, test tube rack, cylinder grid

**When to use:** Any holder with a regular grid of cylindrical wells — battery holders, pen/marker holders, test tube racks, lipstick organizers, spice jar holders.

**What it is:** A rounded-corner box with a grid of cylindrical wells cut via `difference()`. Wells are sized to item diameter + clearance. Contact/access slots cut through divider walls and floor. Walls are shorter than items for easy access.

**Key design decisions:**
- Wall height: 55-65% of item length (not 100% — looks like solid block)
- Divider width: 3mm minimum (room for contact slots)
- Floor thickness: 3mm for structural integrity with through-slots
- Grid spacing: item_diameter + clearance + divider_width

**Proven code template:**
```openscad
$fn = 120;

// Item dimensions (AA battery example)
item_d = 14.5;
item_len = 50.5;
clearance = 0.5;
well_d = item_d + 2 * clearance;

// Structure
wall = 2;
div = 3;
bottom = 3;
slot_w = 3;
slot_h = 10;

// Grid: NxN
cols = 2;
rows = 2;
spacing = well_d + div;
body_w = cols * well_d + (cols-1) * div + 2 * wall;
body_d = rows * well_d + (rows-1) * div + 2 * wall;
body_h = item_len * 0.55 + bottom;

corner_r = 3;

module rbox(w, d, h, r) {
    hull() {
        for (x = [r, w - r])
            for (y = [r, d - r])
                translate([x, y, 0]) cylinder(r = r, h = h);
    }
}

module holder() {
    difference() {
        translate([-body_w/2, -body_d/2, 0])
            rbox(body_w, body_d, body_h, corner_r);

        for (c = [0 : cols-1])
            for (r = [0 : rows-1]) {
                cx = (c - (cols-1)/2) * spacing;
                cy = (r - (rows-1)/2) * spacing;

                // Well
                translate([cx, cy, bottom])
                    cylinder(d = well_d, h = body_h);

                // Floor slot (for contacts/drainage)
                translate([cx - slot_w/2, cy - slot_w/2, -1])
                    cube([slot_w, slot_w, bottom + 2]);
            }

        // Divider slots (spring contacts or access)
        for (c = [0 : cols-1]) {
            cx = (c - (cols-1)/2) * spacing;
            translate([cx - slot_w/2, -slot_w/2, bottom])
                cube([slot_w, slot_w, slot_h]);
        }
        for (r = [0 : rows-1]) {
            cy = (r - (rows-1)/2) * spacing;
            translate([-slot_w/2, cy - slot_w/2, bottom])
                cube([slot_w, slot_w, slot_h]);
        }

        // Finger scoops at outer walls
        for (c = [0 : cols-1])
            for (r = [0 : rows-1]) {
                cx = (c - (cols-1)/2) * spacing;
                cy = (r - (rows-1)/2) * spacing;
                for (side = [[cx > 0 ? 1 : -1, 0], [0, cy > 0 ? 1 : -1]]) {
                    translate([
                        side[0] != 0 ? side[0] * body_w/2 : cx,
                        side[1] != 0 ? side[1] * body_d/2 : cy,
                        body_h - 3
                    ]) cylinder(d = 8, h = 5);
                }
            }
    }
}

holder();
```

**Sizing guidelines:**
| Parameter | Guideline |
|-----------|-----------|
| `wall` | 1.5-2.5mm outer wall |
| `div` | 2.5-4mm internal dividers |
| `bottom` | 2-4mm floor |
| `body_h` | 50-65% of item length (taller = more secure, shorter = easier access) |
| `slot_w` | 3-4mm for contact slots |
| `corner_r` | 2-4mm for rounded corners |

**Adapting for different holders:**
| Object | Well diameter | Wall height | Slots |
|--------|-------------|-------------|-------|
| AA battery holder | 15.5mm | 55% | Contact slots in floor + dividers |
| Pen holder | 12-14mm | 40% | No slots needed |
| Test tube rack | 18-20mm | 50% | Drainage holes in floor |
| Lipstick organizer | 22-24mm | 45% | No slots |
| Spice jar holder | 45-50mm | 35% | No slots |

**Pitfalls:**
- Walls at 100% item height = solid block appearance — keep to 55-65%
- Side window cutouts look decorative, not functional — use divider slots for contact access
- Stacking layers in Z makes front view ambiguous — keep single-layer grid
- End-to-end arrangements look elongated, not "grid" — maintain square/near-square footprint
- Non-manifold from intersecting cuts at edges — offset by 0.01mm
- Contact slots must be visible from at least one camera angle to register with evaluator

**Discovered:** AA battery holder session, 8 iterations. Peaked at score 7/10. Key findings: vertical batteries with short walls read as "holder" better than horizontal layout. Square footprint reads as "2x2 grid" better than elongated rectangle. Spring contact slots in divider walls + floor slots are the most recognizable feature. Wall height of ~55% item length is the sweet spot — tall enough to hold, short enough to not look like a block.

---

---

### Technique: Hull-Chain Lever Handle
Keywords: lever handle, door handle, lever, grip, ergonomic handle, door lever, rosette, escutcheon, spindle

**When to use:** Any lever-style door handle with a rosette/escutcheon base and an extending grip.

**What it is:** A rosette cylinder base with a square spindle hole, connected via a conical hull neck to a curved lever grip built as a hull chain of scaled spheres.

**Architecture:**
```
1. Rosette: cylinder with square spindle hole (difference)
2. Neck: hull() from cylinder at rosette top to first grip sphere
3. Lever grip: hull chain of scaled spheres along cos() arc
4. Tip: full sphere at lever end for rounded cap
```

**Proven code template:**
```openscad
$fn = 120;
rosette_r = 26;
rosette_depth = 8;
spindle_sq = 8;
lever_len = 105;
segments = 24;
return_h = 25;

function grip_x(t) = t * lever_len;
function grip_z(t) = rosette_depth + return_h * cos(t * 80);
function grip_w(t) = 11 - 3.5 * t;
function grip_h(t) = 8 - 2.5 * t;

module rosette() {
    difference() {
        union() {
            cylinder(r = rosette_r, h = rosette_depth);
            cylinder(r = rosette_r + 1.5, h = 1.5);
        }
        translate([0, 0, -1])
            linear_extrude(height = rosette_depth + 2)
                square([spindle_sq, spindle_sq], center = true);
    }
}

module neck() {
    hull() {
        translate([0, 0, rosette_depth - 0.5])
            cylinder(r = 13, h = 0.5);
        translate([0, 0, grip_z(0)])
            scale([grip_w(0), 8, grip_h(0)])
                sphere(r = 1, $fn = 16);
    }
}

module lever_grip() {
    for (i = [0 : segments - 1]) {
        assign(t0 = i / segments, t1 = (i + 1) / segments) {
            hull() {
                translate([grip_x(t0), 0, grip_z(t0)])
                    scale([grip_w(t0), grip_h(t0), grip_h(t0)])
                        sphere(r = 1, $fn = 16);
                translate([grip_x(t1), 0, grip_z(t1)])
                    scale([grip_w(t1), grip_h(t1), grip_h(t1)])
                        sphere(r = 1, $fn = 16);
            }
        }
    }
}

module tip_cap() {
    translate([grip_x(1), 0, grip_z(1)])
        scale([grip_w(1), grip_h(1), grip_h(1)])
            sphere(r = 1);
}

union() {
    rosette();
    neck();
    lever_grip();
    tip_cap();
}
```

**Key principles:**
| Principle | Why |
|-----------|-----|
| cos(t*80) for lever arc | Gives visible droop curve, not too extreme |
| return_h >= 25mm | Enough neck clearance to look like real handle |
| scale([w, h, h]) on sphere(1) | Elliptical cross-section for ergonomic feel |
| End radius > 60% of start | Prevents pointed tip |
| $fn=16 on hull spheres | Fast render, visually identical |
| Decorative lip at rosette base | Looks like real hardware |
| assign() not let() in hull | let() doesn't work inside hull() in OpenSCAD |

**Pitfalls:**
- let() inside hull() fails silently — variables are undefined. Use assign() or functions.
- Adding finger ridges (small bumps) looks like artifacts, not ergonomic features.
- Square spindle hole is invisible from standard camera angles — it's inside the cylindrical rosette.
- Cutaway to show spindle looks broken. Accept that internal holes aren't visible in renders.
- Grip taper too aggressive → pointed tip. Keep minimum 60% of start radius.
- sin() for droop curve is too gentle. cos(t*80) gives better visible arc.

**Discovered:** Door handle session, 9 iterations. Peaked at 7/10. Key breakthroughs: (1) cos(t*80) arc for visible droop (iter 4), (2) scaled spheres for elliptical cross-section (iter 4), (3) decorative rosette lip (iter 4). Failed approaches: finger ridges (artifacts, iter 5), cutaway rosette (broken look, iter 7), square spindle recess (not visible, iter 8). Stuck point: square spindle hole fundamentally invisible from standard render angles.

---

### Technique: Crescent-Hook Flat Tool
Keywords: bottle opener, flat, lever, pry, hook, tool, opener, flat profile, leverage cutout, wrench, flat tool, hand tool

**When to use:** Any flat hand tool with a hook or pry feature — bottle openers, flat wrenches, pry bars, lever tools. Objects that are essentially a 2D profile extruded to a uniform thickness.

**What it is:** `linear_extrude()` of a 2D profile built from `hull()` of circles (body) plus crescent-shaped hook (two offset circles with square cutaway) plus cutout holes.

**Why this approach:**
- `hull()` of circles creates smooth tapered bodies with rounded ends — perfect for handles
- Crescent from offset circles creates the curved hook/lip geometry naturally
- Square cutaway opens the crescent into a hook shape
- Simple `circle()` subtractions for leverage cutouts and keyring holes
- All 2D operations are fast and produce clean geometry

**Proven code template:**
```openscad
$fn = 120;
thickness = 3;

module opener_profile() {
    difference() {
        union() {
            // Body: tapered handle to pry end
            hull() {
                translate([-55, 0]) circle(d = 24);  // handle end
                translate([20, 0]) circle(d = 28);    // shoulder
            }
            // Pry hook: crescent shape
            difference() {
                translate([35, 0]) circle(d = 36);              // outer arc
                translate([40, 0]) circle(d = 28);              // inner opening
                translate([55, 0]) square([20, 40], center=true); // open far end
            }
        }
        // Leverage cutout
        translate([0, 0]) scale([2.5, 1]) circle(d = 14);
        // Keyring hole
        translate([-52, 0]) circle(d = 10);
    }
}

linear_extrude(height = thickness) opener_profile();
```

**Tuning:**
| Parameter | Effect |
|-----------|--------|
| `thickness` | Tool thickness — 2-4mm for realistic flat tools |
| Handle `circle(d)` | Handle width — 20-28mm |
| Outer/inner circle offset | Controls lip width — 5mm offset gives clean hook |
| `scale([2.5, 1])` on cutout | Elongation of leverage hole |
| Keyring hole `d` | 8-12mm for standard keyring |

**Pitfalls:**
- Hull of circles alone can't make a hook — need explicit crescent geometry
- Closed ring (no square cutaway) doesn't look like an opener
- Inner circle too close to outer → jagged thin lip
- Leverage cutout too small → not visible as a feature
- Thickness > 5mm → doesn't look "flat"

**Discovered:** Bottle opener session, 3 iterations. Key insight: crescent from offset circles + square cutaway creates clean hook geometry (iter 3).

---

The existing Box/Enclosure Assembly technique in agent.md is already well-documented and produced a score of 8 on the first attempt. No changes needed — the template is proven.

---

### Technique: Chess Rook (Hybrid Revolution + CSG)
Keywords: chess, rook, castle, tower, crenellation, battlement, merlon, turret

**When to use:** Chess rook or any tower-like object with a tapered body and crenellated/battlemented top.

**What it is:** `rotate_extrude()` for the smooth body profile + `difference()` with pie-slice polygon cuts for crenellations.

**Decomposition:**
1. **Base** — stepped foot with 2-3 tiers (explicit polygon points)
2. **Decorative ring** — raised bump at lower third of shaft (polygon point interruption)
3. **Shaft** — linear taper from ring to collar
4. **Collar** — small bump below parapet
5. **Parapet** — flared cylinder wall (hollow inside)
6. **Crenellations** — 8 pie-slice cuts from top of parapet

**Key parameters:**
| Parameter | Good value | Effect |
|-----------|-----------|--------|
| Crenellation count | 8 | Classic rook look |
| Gap angle | 18° | Good merlon-to-gap ratio |
| Parapet height | ~11% of total height | Proportional battlements |
| Parapet flare | shaft_top_r + 3mm | Visible widening |

**Pitfalls:**
- Too few crenellations (4-5) looks wrong — use 8
- Crenellation cuts too tall look like fingers — keep to ~11% of total height
- Use pie-slice polygon, not cubes, for cuts on round body
- Cut radius must exceed body radius to fully penetrate
- Decorative ring belongs at lower third of shaft, not mid-shaft

---

### Technique: Coffee Cup / Mug with Handle
Keywords: cup, mug, coffee cup, tea cup, coffee mug, stein, tankard, handled vessel

**When to use:** Any cup or mug with a handle — coffee cups, tea cups, mugs, steins, tankards.

**What it is:** Combines two techniques: Bezier Profile Revolution for the cup body + Hull-Sphere Path Handle for the D-shaped handle.

**Key proportions for a coffee cup:**
| Parameter | Value | Why |
|-----------|-------|-----|
| Height | 75-85mm | Standard coffee cup height |
| Diameter | 70-80mm | Height:diameter ratio near 1:1 |
| Wall thickness | 2.5mm | Printable, realistic |
| Foot height | 5-8mm | Visual weight without being chunky |
| Handle width | 28-35mm | Must protrude enough to grip |
| Handle tube_r | 4-5mm | Thick enough to look comfortable |
| Handle top_z | 78-82% of height | Near rim but not at rim |
| Handle bot_z | 20-25% of height | Above narrow base zone |

**Critical insight — handle size:** The handle must be very prominent. Width < 24mm makes the handle look like a tiny bump. Use width >= 28mm and tube_r >= 4mm for a grippable D-handle.

**Cup body taper:** Use gentle bezier taper (P0=35 to P4=39, only ~4mm difference over full height). Too much taper = bucket shape. Too little = can shape.

**Pitfalls:**
- Handle width < 24mm → handle invisible from side view
- Handle tube_r < 4mm → handle looks fragile
- Cup height:width ratio > 1.3 → looks like a tumbler, not a cup
- Handle bot_z < 20% of height → handle pokes through narrowing base
- Missing foot → cup looks like it's floating

**Discovered:** Coffee cup session, 4 iterations. Main challenge was getting the handle large enough to be visually prominent.

---

### Technique: Hull-Chain Helix (Springs & Coils)

**When to use:** Any helical/coiled object — compression springs, torsion springs, spiral columns, coiled wire.

**Core idea:** Place spheres along a parametric helix path and hull-chain adjacent pairs. The helix is defined by `angle = i * 360 / segs_per_coil` and `z = i * pitch / segs_per_coil`.

**Key parameters:**
- `coil_r = outer_r - wire_r` (keeps spring within specified diameter)
- `pitch = height / coils` (even coil spacing)
- `segs_per_coil = 16` (minimum for smooth appearance)
- `wire_d < pitch / 2` (prevents solid-cylinder look)
- `$fn = 16` on hull spheres (smooth wire cross-section without killing compile time)

**Code template:**
```openscad
outer_d = 20;
outer_r = outer_d / 2;
wire_d = 2;
wire_r = wire_d / 2;
coils = 6;
height = 30;
pitch = height / coils;
coil_r = outer_r - wire_r;
segs_per_coil = 16;
total_segs = coils * segs_per_coil;

for (i = [0 : total_segs - 1]) {
    a1 = i * 360 / segs_per_coil;
    a2 = (i + 1) * 360 / segs_per_coil;
    z1 = i * pitch / segs_per_coil;
    z2 = (i + 1) * pitch / segs_per_coil;
    hull() {
        translate([coil_r * cos(a1), coil_r * sin(a1), z1])
            sphere(d = wire_d, $fn = 16);
        translate([coil_r * cos(a2), coil_r * sin(a2), z2])
            sphere(d = wire_d, $fn = 16);
    }
}
```

**Pitfalls:**
- Spring looks like solid cylinder → wire_d too large relative to pitch, keep wire_d < pitch/2
- Compile takes 10+ minutes → reduce $fn on spheres to 16, keep segs_per_coil at 16
- Spring wider than specified diameter → use coil_r = outer_r - wire_r, not outer_r
- Faceted coil path → need at least 16 segments per coil
- Faceted wire cross-section → need at least $fn=16 on spheres

---

### Technique: Egg-Crate Cross-Slot Grid
Keywords: drawer divider, egg crate, cross slot, interlocking, grid divider, compartment divider, organizer insert, partition, lattice divider

**When to use:** Any flat grid divider where perpendicular panels interlock via half-lap cross slots — drawer dividers, egg crate organizers, compartment inserts, wine glass dividers, box partitions.

**What it is:** Two sets of perpendicular flat panels that interlock at intersections. Longitudinal panels have slots cut from the top; transverse panels have slots cut from the bottom. Each slot is half the panel height deep (plus a small overlap), so they lock together at the midpoint.

**Architecture:**
```
1. Define drawer dimensions (W, D) and panel count (n_long, n_trans)
2. Compute even spacing for each direction
3. Longitudinal panels: full-depth cubes with top slots at each intersection
4. Transverse panels: full-width cubes with bottom slots at each intersection
5. Slot width = panel_t + clearance (0.2mm)
6. Slot depth = panel_h/2 + 1mm (overlap at midpoint)
```

**Proven code template:**
```openscad
$fn = 60;
drawer_w = 200; drawer_d = 150; panel_h = 50;
panel_t = 2.5; slot_clearance = 0.2;
n_long = 3; n_trans = 4;

long_spacing = drawer_w / (n_long + 1);
trans_spacing = drawer_d / (n_trans + 1);
slot_w = panel_t + slot_clearance;
slot_depth = panel_h / 2 + 1;

module long_panel(x_pos) {
    difference() {
        translate([x_pos - panel_t/2, 0, 0])
            cube([panel_t, drawer_d, panel_h]);
        for (i = [1:n_trans]) {
            y = i * trans_spacing;
            translate([x_pos - slot_w/2, y - slot_w/2, panel_h - slot_depth])
                cube([slot_w, slot_w, slot_depth + 1]);
        }
    }
}

module trans_panel(y_pos) {
    difference() {
        translate([0, y_pos - panel_t/2, 0])
            cube([drawer_w, panel_t, panel_h]);
        for (i = [1:n_long]) {
            x = i * long_spacing;
            translate([x - slot_w/2, y_pos - slot_w/2, -1])
                cube([slot_w, slot_w, slot_depth + 1]);
        }
    }
}

translate([-drawer_w/2, -drawer_d/2, 0]) {
    for (i = [1:n_long]) long_panel(i * long_spacing);
    for (i = [1:n_trans]) trans_panel(i * trans_spacing);
}
```

**Sizing guidelines:**
| Parameter | Guideline |
|-----------|-----------|
| `panel_t` | 2-3mm for 3D printing, thicker for wood/acrylic |
| `panel_h` | 30-80mm depending on drawer depth |
| `slot_clearance` | 0.2mm for snug fit |
| `slot_depth` | panel_h/2 + 1mm for secure interlock |
| `n_long/n_trans` | Depends on desired compartment count |

**Pitfalls:**
- Slot width must include clearance or panels won't fit together
- Slot depth must exceed half height slightly or panels will be loose
- Don't use hull() or rounded shapes for panels — flat cubes are correct for this
- Center the assembly for good camera views

**Discovered:** Drawer divider session, 1 iteration. Scored 8/10 on first attempt. Straightforward CSG subtraction technique — the key insight is opposing slot directions (top vs bottom) for interlocking.

---

### Technique: Simple Annular CSG (Washers, Rings, Spacers)
Keywords: washer, flat washer, ring, annulus, spacer, shim, bore, gasket

**When to use:** Any flat ring-shaped object defined by outer diameter, inner diameter (bore), and thickness — washers, spacers, shims, gaskets, simple rings.

**What it is:** The simplest CSG pattern: `difference()` of two concentric cylinders. The outer cylinder defines the body, the inner cylinder creates the bore hole.

**Core pattern:**
```openscad
$fn = 120;
outer_d = 20;  // outer diameter
bore_d = 8;    // inner hole diameter
thickness = 2; // height

difference() {
    cylinder(h = thickness, d = outer_d);
    translate([0, 0, -1])
        cylinder(h = thickness + 2, d = bore_d);
}
```

**Design rules:**
- Always extend bore cylinder 1mm past both faces (z=-1, h=thickness+2) to avoid z-fighting
- Use $fn=120 for smooth edges
- For very thin washers (< 1mm), ensure bore cylinder still fully penetrates

**Pitfalls:**
- Bore cylinder same height as body → z-fighting on faces
- Low $fn → visible polygon facets on what should be smooth circles

---

### Technique: Thin-Walled Cone Shell (Lampshade)
Keywords: lampshade, shade, lamp, cone shell, conical, taper, funnel, open-ended, diffuser

**When to use:** Any thin-walled conical or tapered open shell — lampshades, funnels (without spout), diffuser cones, tapered covers, dunce caps, megaphone shapes.

**What it is:** A closed-polygon cross-section defining outer wall, top cap, inner wall, and bottom cap, revolved 360°. Uses linear interpolation with subtle sine concavity for an elegant taper. Wire ring torus primitives at top and bottom edges for structural definition.

**Why it beats alternatives:**
- Full bezier profile revolution → too much curve control leads to vase/bell shapes instead of clean taper
- difference() of two solid cones → orange z-fighting artifacts where surfaces coincide, slower compile
- Pure straight cone → boring silhouette, doesn't look like a real lampshade
- **Linear + sine concavity + wire rings → clean, fast, recognizable lampshade**

**The pattern:**
```openscad
$fn = 120;
total_h = 80;
bottom_r = 50;
top_r = 16;
wall_t = 1.8;

function r_at(t) =
    let(linear = bottom_r * (1 - t) + top_r * t,
        concave = -4 * sin(t * 180))
    linear + concave;

n = 80;
pts = concat(
    [for (i = [0:n]) let(t = i/n) [r_at(t), t * total_h]],
    [[top_r, total_h], [top_r - wall_t, total_h]],
    [for (i = [n:-1:0]) let(t = i/n) [max(2, r_at(t) - wall_t), t * total_h]],
    [[bottom_r - wall_t, 0], [bottom_r, 0]]
);

rotate_extrude(angle = 360) polygon(points = pts);

// Wire rings for structure
for (pos = [[bottom_r - wall_t/2, 0], [top_r - wall_t/2, total_h]])
    translate([0, 0, pos[1]])
        rotate_extrude() translate([pos[0], 0]) circle(r = 1.2, $fn = 16);
```

**Tuning:**
| Parameter | Effect |
|-----------|--------|
| concave amplitude (-4) | 0 = straight cone, -4 = subtle, -8 = dramatic |
| wall_t (1.8) | 1.5 = delicate, 2.0 = sturdy, >2.5 = looks solid |
| bottom_r / top_r ratio (3:1) | Higher = more dramatic flare |
| wire_r (1.2) | Ring prominence — 0.8 subtle, 1.5 bold |

**Pitfalls:**
- Never use polygon points going to [0, z] — creates solid caps on what should be open ends
- Bezier with strong control points creates vase/bell shape — use linear+sine instead
- difference() of two solid cones creates z-fighting artifacts — use closed polygon profile
- Wall > 2mm reads as solid to scorer — keep thin (1.5-1.8mm)
- Wire rings at edges are essential — without them, scorer can't tell edges are open
- Concave amplitude > 6mm starts looking like a vase, not a shade

**Discovered:** Lampshade session, 6 iterations. Bezier revolution (iter 0-3) → stuck at 7, too bulgy/solid looking. Straight cone + sine concavity + wire rings (iter 5) → score 8, clean lampshade silhouette.

---

### Technique: Radial Slot Disc
Keywords: drain, drain cover, shower drain, grate, radial slots, vent, grille, wheel cover, strainer, radial pattern

**When to use:** Any flat circular disc with elongated slots radiating from center — drain covers, vent covers, speaker grilles, wheel covers, strainers.

**What it is:** A flat cylinder with through-cut radial slots created using `hull()` of two small cylinders positioned at inner and outer radii, then rotated around the center. Two rings of slots (primary full-length + secondary shorter offset) create a realistic drainage pattern.

**Core structure:**
1. Base disc (cylinder)
2. Downward rim lip (difference of two cylinders extending below disc)
3. Radial slot cuts via hull() of endpoint cylinders
4. Two slot rings: primary (8 slots) + secondary (8 shorter slots, offset by half-step)

**Proven code template:**
```openscad
$fn = 120;
diameter = 80;
radius = diameter / 2;
thickness = 3;
rim_w = 4;
rim_lip_h = 4;
center_hub_r = 8;
num_slots = 8;
slot_width = 4;

module radial_slot(inner_r, outer_r, width) {
    hull() {
        translate([inner_r, 0, -1])
            cylinder(h = thickness + 2, d = width);
        translate([outer_r, 0, -1])
            cylinder(h = thickness + 2, d = width);
    }
}

module drain_cover() {
    difference() {
        union() {
            cylinder(h = thickness, r = radius);
            translate([0, 0, -rim_lip_h])
                difference() {
                    cylinder(h = rim_lip_h, r = radius);
                    translate([0, 0, -1])
                        cylinder(h = rim_lip_h + 2, r = radius - rim_w);
                }
        }
        for (i = [0 : num_slots - 1])
            rotate([0, 0, i * 360 / num_slots])
                radial_slot(center_hub_r + 2, radius - rim_w - 1, slot_width);
        for (i = [0 : num_slots - 1])
            rotate([0, 0, i * 360 / num_slots + 360 / num_slots / 2])
                radial_slot(center_hub_r + 8, radius - rim_w - 5, 3);
    }
}

drain_cover();
```

**Pitfalls:**
- Don't use circular holes — use elongated hull() slots for the radial pattern
- Don't use cube() for slots on a round disc — hull() of two cylinders gives rounded ends
- Keep center hub solid (r >= 8mm) — too small and the center looks fragile
- Add downward rim lip — real drain covers seat into the pipe
- Leave solid rim ring (>= 4mm) at outer edge

**Discovered:** Shower drain cover session, 3 iterations. Key insight: hull() of two endpoint cylinders creates clean rounded-end radial slots. Two offset rings of slots (primary + secondary) give realistic drainage density.

---

### Technique: Rounded Tray with Through-Slots
Keywords: soap dish, drainage, slots, tray, dish, draining, ventilation, raised edges, drip tray

**When to use:** Any shallow tray or dish that needs drainage slots, ventilation cuts, or decorative through-cuts in the floor.

**What it is:** A rounded-rectangle tray shell with narrow stadium-shaped slots cut through the floor using hull() of cylinder pairs.

**Core approach:**
1. Build outer shell as hull() of 4 corner cylinders (corner_r >= 15mm for organic look)
2. Hollow out interior with slightly smaller rounded-rect offset by wall_t
3. Cut slots through floor using hull() of 2 cylinders per slot (gives rounded ends)
4. Slots should be 3-5mm wide, >= 70% of inner dish length, evenly spaced

**Key dimensions:**
- dish_length: 120-140mm, dish_width: 80-90mm, dish_height: 20-25mm
- wall_t: 3-4mm, floor_t: 4-5mm
- corner_r: 15-20mm (organic), 8-10mm (more geometric)
- slot_width: 3-5mm, slot_length: 80-100mm
- slot_spacing: 12-16mm between slot centers

**Key code pattern:**
```openscad
module rounded_rect(l, w, h, r) {
    hull() {
        for (x = [-l/2 + r, l/2 - r])
            for (y = [-w/2 + r, w/2 - r])
                translate([x, y, 0])
                    cylinder(h = h, r = r);
    }
}

difference() {
    rounded_rect(dish_length, dish_width, dish_height, corner_r);
    translate([0, 0, floor_t])
        rounded_rect(dish_length - 2*wall_t, dish_width - 2*wall_t, dish_height, corner_r - wall_t);
    // Rounded-end slots
    for (i = [0:slot_count-1]) {
        y_pos = -(slot_count-1) * slot_spacing / 2 + i * slot_spacing;
        translate([0, y_pos, -1])
            hull() {
                translate([-slot_length/2 + slot_width/2, 0, 0])
                    cylinder(h = floor_t + 2, r = slot_width/2);
                translate([slot_length/2 - slot_width/2, 0, 0])
                    cylinder(h = floor_t + 2, r = slot_width/2);
            }
    }
}
```

**Pitfalls:**
- Slots invisible if too narrow (< 3mm) or too short (< 70% of dish length)
- Too-wide slots (> 8mm) turn floor into slats — looks like a grate, not a dish
- cube() slots have sharp rectangular ends — use hull() of cylinders for rounded stadium shape
- Small corner_r makes dish look like a box, not a soap dish
- Always extend slot cylinders from z=-1 to floor_t+2 to fully penetrate floor

---

### Technique: Wall-Mount Rod Holder
Keywords: toilet paper holder, towel holder, wall mount, rod holder, bathroom hardware, paper holder, TP holder, toilet roll holder, wall-mounted holder

**When to use:** Any wall-mounted holder with a rod that holds a cylindrical object (toilet paper, paper towels, towel bars with open ends).

**What it is:** Wall plate with screw holes + cylindrical arm extending from wall + horizontal rod extending from arm end to one side + spherical end cap. Pure CSG with cylinders, hull for rounded plate, and difference for screw holes.

**Key geometry:**
- Wall plate: rounded rectangle in XZ plane (vertical wall surface)
- Arm: cylinder extending in Y direction (perpendicular to wall)
- Junction disc: slightly wider cylinder at arm-rod junction
- Rod: cylinder extending in X direction from junction (one side only — open end for loading)
- End cap: sphere at rod tip

**Proven code template:**
```openscad
$fn = 120;
plate_w = 55; plate_h = 85; plate_t = 6; corner_r = 8;
arm_d = 22; arm_len = 65;
rod_d = 14; rod_len = 125;
mount_z = plate_h / 2;

module rrect_plate(w, h, t, r) {
    hull() {
        for (x = [-w/2 + r, w/2 - r])
            for (z = [r, h - r])
                translate([x, t/2, z])
                    rotate([90, 0, 0]) cylinder(r=r, h=t, center=true);
    }
}

module wall_plate() {
    difference() {
        rrect_plate(plate_w, plate_h, plate_t, corner_r);
        for (z = [22, plate_h - 22])
            translate([0, plate_t+1, z]) rotate([90,0,0]) {
                cylinder(d=5, h=plate_t+4);
                cylinder(d1=5, d2=10, h=3);
            }
    }
}

wall_plate();
translate([0, plate_t, mount_z]) rotate([-90,0,0]) cylinder(d=arm_d, h=arm_len);
translate([0, plate_t+arm_len, mount_z]) rotate([0,90,0]) cylinder(d=arm_d+4, h=4, center=true);
translate([2, plate_t+arm_len, mount_z]) rotate([0,90,0]) cylinder(d=rod_d, h=rod_len);
translate([2+rod_len, plate_t+arm_len, mount_z]) sphere(d=rod_d+6);
```

**Design rules:**
| Parameter | Guideline |
|-----------|-----------|
| `plate_w` | 50-60mm |
| `plate_h` | 50-85mm |
| `arm_d` | 18-24mm (thick enough to look structural) |
| `arm_len` | 50-65mm (clearance for roll) |
| `rod_d` | 12-16mm (must fit inside TP roll core ~40mm) |
| `rod_len` | 110-130mm (TP roll ~100mm wide + clearance) |
| `corner_r` | 6-8mm for plate corners |

**Pitfalls:**
- Rod must extend to ONE side only — two-sided or centered rod looks wrong for TP holder
- Two-post designs (rod between two arms) close both ends — scorer penalizes because roll can't be loaded
- Tapered/wedge bracket arms look like construction artifacts — use clean cylinders
- Junction disc between arm and rod is needed for visual transition
- Screw holes need countersinks to look realistic
- Wall plate should be in XZ plane (vertical), not horizontal

---

### Technique: Slotted Holder Block
Keywords: toothbrush holder, pen holder, brush holder, tool holder, slot holder, test tube rack, marker holder, pencil holder, cosmetic brush holder, makeup brush holder

**When to use:** Any holder/organizer where items stand upright in cylindrical holes — toothbrush holders, pen cups with individual slots, brush holders, test tube racks.

**What it is:** A rounded rectangular solid body with cylindrical holes cut from the top using `difference()`. No hollowing needed — the solid material between slots acts as structural walls. Simple, reliable, and always manifold when slots don't touch.

**Key geometry rules:**
- `slot_spacing > 2 * slot_r + 2` (minimum 2mm wall between slots)
- `body_h <= body_w` (stockier looks more realistic)
- `body_d >= 2 * slot_r + 2 * wall` (deep enough for slots + walls)
- `corner_r >= 6` for visible rounding

**Proven code template:**
```openscad
$fn = 120;
body_w = 95;  body_d = 50;  body_h = 70;
corner_r = 10;  bottom = 5;
slot_r = 10;  slot_spacing = 22;

module rbox(w, d, h, r) {
    hull() {
        translate([r, r, 0]) cylinder(r=r, h=h);
        translate([w-r, r, 0]) cylinder(r=r, h=h);
        translate([r, d-r, 0]) cylinder(r=r, h=h);
        translate([w-r, d-r, 0]) cylinder(r=r, h=h);
    }
}

module holder() {
    difference() {
        rbox(body_w, body_d, body_h, corner_r);
        for (i = [0:3])
            translate([body_w/2 + (i - 1.5) * slot_spacing, body_d/2, bottom])
                cylinder(r=slot_r, h=body_h - bottom + 1);
    }
}

translate([-body_w/2, -body_d/2, 0]) holder();
```

**Adapting for different slot counts:**
| Slots | Layout | Spacing formula |
|-------|--------|-----------------|
| 2 | Row | `(i - 0.5) * spacing` |
| 3 | Row | `(i - 1) * spacing` |
| 4 | Row | `(i - 1.5) * spacing` |
| 4 | 2x2 grid | Use nested `for (dx, dy)` with offsets |
| 6 | 2x3 grid | Use nested `for` loops |

**Pitfalls:**
- Tangent slots (spacing = 2*radius) → non-manifold. Always leave 2mm+ gap.
- Drainage holes with coincident faces → non-manifold. Skip or extend through bottom.
- Body too thin (depth < 30mm) → looks like a slab.
- Body too tall (height > width) → looks unrealistic.
- Don't hollow + add dividers — solid body with slot cuts is simpler and more reliable.
- Don't use cylindrical body with top-plate holes — slots appear shallow from side views.

**Discovered:** Toothbrush holder session, 5 iterations. Solid-body approach with cylindrical cuts was reliable from iteration 0. Main challenge was proportions (too tall, too thin, slots too close). Key insight: stockier proportions (w=95, d=50, h=70) score significantly better than tall/thin (w=90, d=40, h=100).

---

### Technique: Wall-Mounted Bar Assembly
Keywords: towel bar, towel rail, grab bar, wall bracket, wall mount, bathroom hardware, curtain rod, towel rack

**When to use:** Any wall-mounted horizontal bar with bracket plates — towel bars, grab bars, curtain rods, towel rails.

**What it is:** Two rounded-rectangle wall plates with screw holes, each with a hull-sphere arm extending perpendicular to the wall, connected by a straight cylindrical rod. The wall sits in the YZ plane, standoff is along X, and the bar runs along Y.

**Key insight — coordinate system:**
- Wall = YZ plane (X=0)
- Plate thickness in +X direction
- Arm standoff in +X direction
- Rod runs along Y axis between brackets

**Key insight — hull arms:**
```
// Hull between two spheres creates smooth tapered arm
hull() {
    translate([bracket_t, 0, 0]) sphere(d = arm_d);
    translate([standoff, 0, 0]) sphere(d = arm_d);
}
```

**Proven code template:**
```openscad
$fn = 120;
bar_span = 400;
rod_d = 16;
standoff = 45;
bracket_w = 50;
bracket_h = 50;
bracket_t = 5;
corner_r = 6;
arm_d = 16;
screw_d = 5;
screw_spacing = 30;

module plate() {
    hull()
        for (dy = [-1, 1], dz = [-1, 1])
            translate([bracket_t/2, dy*(bracket_w/2 - corner_r), dz*(bracket_h/2 - corner_r)])
                rotate([0, 90, 0])
                    cylinder(r = corner_r, h = bracket_t, center = true);
}

module bracket() {
    difference() {
        union() {
            plate();
            hull() {
                translate([bracket_t, 0, 0]) sphere(d = arm_d);
                translate([standoff, 0, 0]) sphere(d = arm_d);
            }
        }
        for (dz = [-1, 1])
            translate([-1, 0, dz * screw_spacing/2])
                rotate([0, 90, 0])
                    cylinder(d = screw_d, h = bracket_t + 4);
    }
}

union() {
    for (side = [-1, 1])
        translate([0, side * bar_span/2, 0]) bracket();
    translate([standoff, -bar_span/2, 0])
        rotate([-90, 0, 0])
            cylinder(d = rod_d, h = bar_span);
}
```

**Pitfalls:**
- Rotation confusion: cylinder grows in Z. rotate([0,90,0]) → X-axis. rotate([-90,0,0]) → Y-axis.
- Screw holes too short: extend 1mm past both surfaces of the plate.
- Arms as separate cylinders → visible seam at plate junction. Hull between spheres is seamless.
- Rod not centered on arms: rod center X must equal standoff value.

**Discovered:** Towel bar session, 1 iteration. Clean CSG assembly with hull-sphere arms scored 8/10 on first attempt.

---

### Technique: T-Profile CSG Stacking
Keywords: T-slot, T-nut, aluminum extrusion, slot nut, drop-in nut, 80/20, V-slot, fastener, channel nut

**When to use:** Any T-shaped cross-section fastener or channel hardware — T-slot nuts, T-bolts, T-track hardware.

**What it is:** Two stacked centered cubes (wide flange + narrow tab) with a through-hole, creating the characteristic T-shaped cross-section when viewed from the front.

**Core approach:**
1. Wide rectangular flange on bottom (locks behind extrusion walls)
2. Narrow rectangular tab on top (fits through slot opening)
3. Both centered on origin, tab sits directly on flange
4. Subtract a through-hole cylinder for the bolt

**Proven code template:**
```openscad
$fn = 120;
flange_w = 16;  flange_d = 10;  flange_h = 4;
tab_w = 6;      tab_d = 10;     tab_h = 2.5;
hole_d = 5.5;
total_h = flange_h + tab_h;

difference() {
    union() {
        translate([-flange_w/2, -flange_d/2, 0])
            cube([flange_w, flange_d, flange_h]);
        translate([-tab_w/2, -tab_d/2, flange_h])
            cube([tab_w, tab_d, tab_h]);
    }
    translate([0, 0, -1])
        cylinder(h = total_h + 2, d = hole_d);
}
```

**Proportion guidelines:**
| Parameter | Ratio | Why |
|-----------|-------|-----|
| flange_w : tab_w | ~2.5-3:1 | Clear T-shape silhouette |
| flange_h : tab_h | ~1.5:1 | Flange should dominate |
| hole_d : tab_w | ~0.8-0.9 | Hole fills tab but doesn't weaken it |
| flange_d : flange_w | ~0.6:1 | Elongated, not square |

**Pitfalls:**
- Square footprint (depth = width) looks wrong — keep depth < width
- Tab taller than flange inverts the visual hierarchy
- Hole too large looks like a washer, not a nut
- Anti-rotation serrations too small to read at render scale — skip them
- Right-side view will always show a plain rectangle (correct geometry, but scorer may penalize)

**Discovered:** T-slot nut session, 6 iterations. Best score 7/10. Simple two-cube stacking is the right approach; complexity (serrations, chamfers, countersinks) didn't improve scores.

---

The existing "Twisted Wavy Extrusion" technique in agent.md is already comprehensive and produced a score of 8 on the first attempt. No new technique section needed — the template works as-is.

**Suggested addition to pitfalls:**
- Top opening inherits wavy cross-section shape → add a thin circular rim cylinder at top for clean opening if needed

---

### Technique: Hull-Sphere Wing Fin
Keywords: wing nut, butterfly nut, thumb screw, wing bolt, hand-tightened fastener, finger grip nut

**When to use:** Any fastener with two (or more) thin finger-grip wings — wing nuts, butterfly nuts, thumb screws with wing heads, hand-tighten bolts.

**What it is:** Each wing is a `hull()` of 4 scaled spheres forming a thin curved fin. Spheres are scaled flat in Y (thickness direction) to create the thin paddle shape. Central hub is a `cylinder()`. Wings are `mirror()`ed for symmetry.

**Why hull-of-spheres beats alternatives:**
- Polar cosine profile (N=2) → flat disc lobes, wrong silhouette (no upswept fins)
- Cube-based hull → rectangular slabs, no organic curve
- Single hull of two cylinders → too simple, no curvature control
- Hull of 4 scaled spheres → smooth organic curve with full control over shape

**Key dimensions for wing nuts:**
| Size | bore_d | hub_r | hub_h | wing_extend | wing_thick | wing_rise |
|------|--------|-------|-------|-------------|------------|-----------|
| M6   | 6      | 5     | 6     | 10-11       | 1.5        | 4-6       |
| M8   | 8      | 6.5   | 7     | 13          | 2.0        | 5-7       |
| M10  | 10     | 8     | 8     | 15          | 2.5        | 6-8       |

**Proven code template:**
```openscad
$fn = 120;
bore_d = 6;
hub_r = 5;
hub_h = 6;
wing_extend = 11;
wing_thick = 1.5;
wing_rise = 5;

module wing() {
    hull() {
        translate([hub_r - 1, 0, hub_h * 0.25])
            scale([1.5, wing_thick/2, hub_h * 0.4])
                sphere(r = 1);
        translate([wing_extend, 0, hub_h + wing_rise - 2])
            scale([2, wing_thick/2, 2])
                sphere(r = 1);
        translate([hub_r - 1, 0, hub_h + wing_rise - 2])
            scale([1.5, wing_thick/2, 1.5])
                sphere(r = 1);
        translate([wing_extend - 1, 0, hub_h * 0.25])
            scale([1.5, wing_thick/2, 1.5])
                sphere(r = 1);
    }
}

module wing_nut() {
    difference() {
        union() {
            cylinder(h = hub_h, r = hub_r);
            wing();
            mirror([1, 0, 0]) wing();
        }
        translate([0, 0, -1])
            cylinder(h = hub_h + wing_rise + 10, d = bore_d);
        translate([0, 0, hub_h - 0.5])
            cylinder(h = 1, d1 = bore_d, d2 = bore_d + 1.5);
        translate([0, 0, -0.5])
            cylinder(h = 1, d1 = bore_d + 1.5, d2 = bore_d);
    }
}

wing_nut();
```

**Pitfalls:**
- Polar cosine (N=2) gives flat disc lobes — use hull-sphere approach instead
- Cube hull gives rectangular wings — must use spheres for organic curve
- Wings must rise above hub top or they look like flat pads
- wing_thick < 2mm for proper thin fin appearance
- Compile time ~55s due to sphere CSG — acceptable but could reduce sphere $fn
- Wing base must overlap hub by 1-2mm to avoid visible seam

---

### Technique: Wire-Path with Eye Loop (Fasteners)

**When to use:** Cotter pins, split pins, hairpin clips, wire-formed fasteners — any object that's a bent wire with a loop.

**Core approach:**
1. Model the wire as a series of hull()-connected spheres along the path
2. Build the eye as a nearly-full-circle arc (360° minus the small gap where tines emerge)
3. Calculate the arc gap angle with `delta = asin(tine_spacing / (2 * eye_radius))`
4. Splay tine tips outward over a short zone (15-20% of tine length)

**Key parameters:**
- Wire diameter: ~2-3% of total length (0.7mm for 30mm pin)
- Eye radius: ~8-10% of total length
- Tine gap: ~70% of wire diameter
- Tip splay: ~7% of total length over 20% of tine length
- One tine slightly shorter than the other (authentic detail)

**Critical rules:**
- All segments must share endpoints to form one continuous piece
- Use hull() between spheres for smooth wire segments
- Nearly-full circle (not semicircle) for the eye — the gap is only where tines emerge
- Connect eye endpoints to tine tops with bridge segments
- $fn=16 on spheres is sufficient for wire cross-section

**Template:**
```openscad
wire_d = 0.7;
wire_r = wire_d / 2;
total_len = 30;
eye_r = 2.5;
tine_gap = 0.5;
cc = tine_gap + wire_d;
tine_len = total_len - 2 * eye_r;
tip_splay = 2.0;
tip_zone = tine_len * 0.2;
$fn = 16;

module wire_seg(p1, p2) {
    hull() {
        translate(p1) sphere(r = wire_r);
        translate(p2) sphere(r = wire_r);
    }
}

delta = asin(cc / (2 * eye_r));
eye_cz = tine_len + eye_r;

union() {
    // Left tine with splayed tip
    wire_seg([-cc/2 - tip_splay, 0, 0], [-cc/2, 0, tip_zone]);
    wire_seg([-cc/2, 0, tip_zone], [-cc/2, 0, tine_len]);
    // Right tine (shorter)
    wire_seg([cc/2 + tip_splay, 0, 0], [cc/2, 0, tip_zone]);
    wire_seg([cc/2, 0, tip_zone], [cc/2, 0, tine_len - 2]);
    // Eye arc
    start_a = -90 - delta;
    total_sweep = 360 - 2 * delta;
    for (i = [0 : 59]) {
        a1 = start_a + i * total_sweep / 60;
        a2 = start_a + (i + 1) * total_sweep / 60;
        wire_seg([eye_r*cos(a1), 0, eye_cz+eye_r*sin(a1)],
                 [eye_r*cos(a2), 0, eye_cz+eye_r*sin(a2)]);
    }
    // Bridge segments
    wire_seg([eye_r*cos(start_a), 0, eye_cz+eye_r*sin(start_a)],
             [-cc/2, 0, tine_len]);
    wire_seg([eye_r*cos(-90+delta), 0, eye_cz+eye_r*sin(-90+delta)],
             [cc/2, 0, tine_len - 2]);
}
```

---

### Technique: Eccentric Cam Lever Assembly
Keywords: cam, lever, eccentric, lobe, pivot, bore, cam lever, eccentric cam, pivot bore

**When to use:** Any cam lever, eccentric lobe, or pivot-bore mechanical lever arm.

**What it is:** A flat mechanical part with an eccentric cam lobe at one end (hull of two offset cylinders), a lever arm extending the opposite direction, and a pivot bore through the center with chamfers.

**Architecture:**
```
1. Cam body: hull(pivot_boss_cylinder + offset_lobe_cylinder) + extra lobe cylinder
2. + Lever arm: hull(pivot_end_cylinder + handle_end_cylinder)
3. + Grip: cylinder + sphere caps at lever end
4. - Pivot bore: cylinder through boss center
5. - Bore chamfers: cones at top and bottom
```

**Key proportions:**
- lobe_offset ~= lobe_r (eccentricity roughly equal to lobe size)
- pivot_boss_d ~= lobe_r * 1.3 (boss should be visible, not swallowed by hull)
- lever_len ~= 3-4× lobe_r
- grip extends above and below cam plane for visual interest

**Pitfalls:**
- Polar cam profiles look too circular from standard render angles — use hull of two circles instead
- Bore off-center on symmetric disc reads as "wrong" — keep bore at origin, offset the lobe mass
- Flat paddle handles score worse than cylindrical/spherical grips for this object class
- hull() of very different radius circles → pure teardrop. Keep radii within 2:1 ratio
- Use $fn=16 on hull sphere caps to keep compile times reasonable

---

### Technique: Flanged Cylindrical Housing
Keywords: bearing, housing, flange, bolt holes, pillow block, mounting, bushing, bore, press-fit, flanged mount

**When to use:** Any cylindrical housing mounted on a flat flange — bearing housings, pillow blocks, flanged bushings, motor mounts, pipe flanges.

**Core approach:**
1. Build a rounded-rectangle flange plate using `hull()` of 4 corner cylinders (`rrect` helper)
2. Add a central cylinder for the housing body, rising from the flange
3. Use `difference()` to subtract: central bore + bolt holes through the flange
4. Bolt holes placed symmetrically in flange corners

**Proven code template:**
```openscad
$fn = 120;
bearing_od = 30;  housing_od = 38;  housing_h = 20;
bore_d = bearing_od;
flange_w = 70;  flange_d = 70;  flange_t = 6;  corner_r = 3;
bolt_d = 5;  bolt_inset = 10;

module rrect(w, d, h, r) {
    hull() {
        for (x = [-(w/2 - r), w/2 - r])
            for (y = [-(d/2 - r), d/2 - r])
                translate([x, y, 0])
                    cylinder(r=r, h=h);
    }
}

difference() {
    union() {
        rrect(flange_w, flange_d, flange_t, corner_r);
        cylinder(d=housing_od, h=housing_h + flange_t);
    }
    translate([0, 0, -1])
        cylinder(d=bore_d, h=housing_h + flange_t + 2);
    for (x = [-(flange_w/2 - bolt_inset), flange_w/2 - bolt_inset])
        for (y = [-(flange_d/2 - bolt_inset), flange_d/2 - bolt_inset])
            translate([x, y, -1])
                cylinder(d=bolt_d, h=flange_t + 2);
}
```

**Design rules:**
| Parameter | Guideline |
|-----------|-----------|
| `housing_od` | bearing_od + 6-10mm for wall thickness |
| `flange_w/d` | housing_od * 1.8-2.0x for proportional look |
| `flange_t` | 5-8mm for structural integrity |
| `bolt_inset` | 8-12mm from flange edge |
| `bolt_d` | 4-6mm typical |
| `corner_r` | 2-4mm for rounded flange corners |

**Pitfalls:**
- Bore must extend past both top and bottom surfaces (z=-1 to h+2) to avoid z-fighting
- Housing cylinder height = housing_h + flange_t (it starts at z=0, same as flange)
- Bolt holes only need to go through flange thickness, not the full housing
- Keep flange proportional to housing — too small looks unstable, too large wastes material

**Discovered:** Bearing housing session, 1 iteration. Scored 8/10 on first attempt. Straightforward CSG pattern — the key is correct proportions and ensuring bore/bolt cuts fully penetrate.

---

### Technique: Clamp-Style Shaft Coupling
Keywords: coupling, shaft coupling, clamp coupling, rigid coupling, shaft connector, set screw coupling, bore coupling, shaft fitting

**When to use:** Any coupling or connector that joins two cylindrical shafts — rigid couplings, clamp couplings, shaft connectors, bore adapters.

**What it is:** A solid cylinder with coaxial bores from each end for shaft insertion, a center groove marking the two-half split, clamping slits cut radially from bore to surface, and through-bolt holes perpendicular to the slits for clamping force.

**Architecture:**
```
1. Solid cylinder (body)
2. - Bore from bottom (shaft 1)
3. - Bore from top (shaft 2)
4. - Center groove (visual split line)
5. - Clamping slits (one per half, opposite sides)
6. - Clamp bolt holes (perpendicular to slits)
7. - End chamfers
```

**Key proportions:**
- Body OD: 3-3.5× shaft diameter
- Body length: 1.1-1.2× body OD (stocky)
- Bore depth: ~44% of body length per side (slight gap in center)
- Slit width: 1-1.5mm
- Clamp bolts: M4 for 8mm shafts, scale with shaft size

**Critical code:**
```openscad
// Clamping slit - runs from bore to outside surface
translate([-slit_w/2, 0, 1])
    cube([slit_w, body_r + 2, bore_depth - 1]);

// Clamp bolt perpendicular to slit
translate([0, 0, bore_depth * 0.5])
    rotate([0, 90, 90])
        cylinder(h = body_d + 4, r = bolt_r, center = true);
```

**Pitfalls:**
- Don't use a raised flange at center — looks like a pipe fitting. Use a subtracted groove instead.
- Set screws alone don't read as a coupling without the clamping slit
- The slit is the single most important visual feature for recognition
- Place slits on opposite sides of each half for multi-view visibility
- Orient bolt holes perpendicular to the slit (they squeeze the slit closed)
- Body that's too long looks like a tube; keep L:D ratio ~1.1-1.2

**Discovered:** Shaft coupling training, 5 iterations. Key breakthrough was adding clamping slits (iter 4) which transformed from "cylinder with holes" to recognizable coupling.

---

The existing "Grid Cavity Tray with Rounded Cube Pockets" technique in agent.md already covers this object well. The proven template worked on first attempt with score 8/10.

One addition to the pitfalls section:
- When prompt says "cube cavities" or "simple geometry," reduce `corner_r` to 2-3mm for more cube-like appearance
- Compile time with hull+spheres at $fn=80 for 12 cavities is ~4.5 minutes — for faster iteration, consider $fn=60 or simple cube cavities with minkowski(cube, sphere(r=2))

---

### Technique: 3D Cylinder U-Cradle for Rod Brackets
Keywords: curtain rod bracket, towel bar bracket, rod holder, cradle bracket, wall mount rod

**When to use:** Any bracket that needs a curved cradle to hold a cylindrical rod — curtain rod brackets, towel bar mounts, pipe supports, tool holders.

**What it is:** A wall plate + arm + U-shaped cradle built from 3D cylinder operations. The cradle is positioned ABOVE the arm so the U sits on top with the opening facing upward.

**Critical positioning rule:** Center the cradle cylinder at `arm_top_z + cradle_r_outer` so the bottom of the U rests on the arm surface. DO NOT center at arm level — that makes the cradle hang below like a hook.

**Why 3D cylinders, not 2D profile + extrusion:** Using `rotate([0,90,0])` with `linear_extrude()` creates confusing axis mapping where 2D X → 3D -Z (inverted). Direct 3D cylinder operations make the geometry intuitive: cut a cylinder in half along Z, and the opening is clearly at +Z (top).

**Proven template:**
```openscad
$fn = 120;
wall_plate_w = 30; wall_plate_h = 55; wall_plate_t = 4;
arm_length = 50; arm_height = 10; arm_width = 22;
rod_d = 25; cradle_wall = 3.5; cradle_w = arm_width;

cradle_r_outer = rod_d/2 + cradle_wall;
cradle_r_inner = rod_d/2;

module cradle() {
    cradle_y = wall_plate_t + arm_length;
    cradle_center_z = wall_plate_h + cradle_r_outer;
    translate([0, cradle_y, cradle_center_z])
        difference() {
            rotate([0, 90, 0])
                cylinder(h = cradle_w, r = cradle_r_outer, center = true);
            rotate([0, 90, 0])
                cylinder(h = cradle_w + 2, r = cradle_r_inner, center = true);
            translate([-(cradle_w/2 + 1), -(cradle_r_outer + 1), 0])
                cube([cradle_w + 2, (cradle_r_outer + 1) * 2, cradle_r_outer + 1]);
        }
}
```

**Pitfalls:**
| Symptom | Cause | Fix |
|---------|-------|-----|
| Cradle looks like a hook hanging down | Cylinder centered at arm level | Center at `arm_top + r_outer` |
| Cradle arch over top instead of U | 2D profile rotation axis mapping inverted | Use 3D cylinder operations directly |
| 270° wrap looks like closed hook | Too much material wrapping | Use 180° (half cylinder) with proper Z positioning |
| Cradle disconnected from arm | Gap between arm top and cradle bottom | Ensure `cradle_center_z - r_outer == arm_top_z` |

---

### Technique: Equal-Height CSG Organizer
Keywords: organizer, desk organizer, compartment, tray, divider, storage, holder, caddy, multi-compartment, box organizer, sorter, pen holder, tiered, stepped, tool holder, craft organizer, makeup organizer, cutlery tray, drawer organizer

**When to use:** Multi-compartment containers where the prompt does NOT specify different heights — desk organizers, caddies, storage trays, drawer dividers. If the prompt says "tiered" or "stepped," use the Stepped CSG Tray technique instead.

**What it is:** A single `rbox()` (rounded rectangle via hull of 4 corner cylinders) as the solid body, with N cavities subtracted via `difference()`. Dividers are the solid material left between adjacent cavities — no explicit divider geometry needed.

**Why equal height works better:** Scorers and humans perceive equal-height compartments as more "practical" and "like a real desk organizer." Stepped heights look like a staircase unless explicitly requested.

**Proven code template:**
```openscad
$fn = 120;
wall = 3; bottom = 3; div_t = 2.5; corner_r = 5;
height = 60; total_d = 85;
sec1_w = 55; sec2_w = 80; sec3_w = 65;
total_w = sec1_w + sec2_w + sec3_w;

module rbox(w, d, h, r) {
    hull() {
        translate([r, r, 0]) cylinder(r=r, h=h);
        translate([w-r, r, 0]) cylinder(r=r, h=h);
        translate([r, d-r, 0]) cylinder(r=r, h=h);
        translate([w-r, d-r, 0]) cylinder(r=r, h=h);
    }
}

difference() {
    rbox(total_w, total_d, height, corner_r);
    translate([wall, wall, bottom])
        cube([sec1_w - wall - div_t/2, total_d - 2*wall, height]);
    translate([sec1_w + div_t/2, wall, bottom])
        cube([sec2_w - div_t, total_d - 2*wall, height]);
    translate([sec1_w + sec2_w + div_t/2, wall, bottom])
        cube([sec3_w - wall - div_t/2, total_d - 2*wall, height]);
}
```

**Pitfalls:**
- Stepped heights look like a staircase — use equal height unless prompt says "tiered"
- Don't make separate boxes per compartment (double walls)
- Cavity height must exceed body height so compartments are fully open
- Use div_t/2 margins on each cavity edge to create consistent divider thickness
- Overlapping solid bodies fill in cavities — sections MUST be non-overlapping cubes
- Separate compartment boxes create double walls (2x thickness) — use single-body + cavities
- hull() with tiny cylinders at internal joints creates bowtie distortion — only round outer corners
- Cavity must extend past section top to fully open
- rbox height must equal tallest section height

---

### Technique: Hex Prism Chamfer via Cone Intersection
Keywords: hex nut, hexagonal, bolt head, hex standoff, hex spacer, hex cap, wrench flat, nut, fastener, hex bar, hex rod

**When to use:** Any hexagonal prismatic object that needs chamfered/beveled edges — hex nuts, bolt heads, hex standoffs, hex spacers, hex bar stock.

**What it is:** `intersection()` of a hex prism (`$fn=6`) with two steep opposing cones. The cones clip the hex corners at top and bottom, creating the characteristic chamfer of real hex fasteners.

**Why intersection beats difference:** Cutting chamfers with `difference()` on a hex body requires complex cone/cylinder math and often over-cuts. The intersection approach naturally clips only what extends beyond the cone — clean, predictable geometry.

**The critical insight — cone steepness and chamfer size:**
- Chamfer value must be >= 2.0mm for renders to show visible chamfers (0.8mm looks sharp)
- Cone steepness `r2 = ar/2 + h*1.5` balances visibility vs barrel avoidance
- Too steep (h*3): chamfers nearly invisible
- Too shallow (h*0.5): barrel/waist shape at mid-height

**Proven code template:**
```openscad
$fn = 120;
af = 17;               // across flats (wrench size, M10)
ar = af / cos(30);     // across corners
nut_h = 9;
hole_d = 10;
chamfer = 2.5;
inner_chamfer = 0.8;

module hexnut() {
    difference() {
        intersection() {
            cylinder(h = nut_h, d = ar, $fn = 6);
            cylinder(h = nut_h, r1 = ar/2 - chamfer, r2 = ar/2 + nut_h * 1.5);
            cylinder(h = nut_h, r1 = ar/2 + nut_h * 1.5, r2 = ar/2 - chamfer);
        }
        translate([0, 0, -1])
            cylinder(h = nut_h + 2, d = hole_d);
        translate([0, 0, nut_h - inner_chamfer])
            cylinder(h = inner_chamfer + 1, d1 = hole_d, d2 = hole_d + inner_chamfer * 3);
        translate([0, 0, -1])
            cylinder(h = inner_chamfer + 1, d1 = hole_d + inner_chamfer * 3, d2 = hole_d);
    }
}
hexnut();
```

**Pitfalls:**
- Chamfer < 2mm renders as sharp edges — use 2.0-2.5mm for visual clarity
- Cone slope h*3 too steep for visible chamfers; h*1.5 is optimal
- `ar = af / cos(30)` not `af * 2`
- `$fn = 6` on hex prism, `$fn = 120` on everything else
- Inner bore chamfers are circular cones in difference(), not part of hex intersection
- Shallow cones (r2 = ar) → barrel/waist shape at mid-height. Use r2 = ar/2 + h*3 or steeper
- `ar = af / cos(30)` not `af * 2` — the across-corners to across-flats relationship is geometric
- Chamfer > 1.2mm on M10 nut looks over-chamfered — keep it 0.5-1.0mm
- Inner bore chamfers use d1/d2 cone, not intersection — they're circular, not hexagonal
- `$fn = 6` on the hex prism, `$fn = 120` on everything else (bore, cones)

---

### Technique: Knurled Cylindrical Grip
Keywords: knurl, knurled, grip, lid, cap, jar lid, bottle cap, dial, knob, textured grip, threaded cap, thread, threaded, screw cap, closure

**When to use:** Any cylindrical object with a textured grip surface — jar lids, bottle caps, knobs, dials, threaded caps.

**What it is:** A flat-top disc with a hollow cylindrical skirt, plus additive triangular ridges around the skirt exterior.

**Architecture:**
```
1. Top disc: cylinder(h=top_h, r=lid_r)
2. Skirt: hollow cylinder going downward via difference()
3. Knurl: for() loop placing triangular ridges at each angular position
4. Optional: inner sealing lip, raised rim ring on top
```

**Proven code template:**
```openscad
$fn = 120;
lid_d = 70;  lid_r = lid_d / 2;
top_h = 4;  skirt_h = 16;  skirt_wall = 2.5;
knurl_count = 90;  knurl_depth = 0.8;  knurl_w = 1.0;

union() {
    // Top disc
    cylinder(h = top_h, r = lid_r);
    // Raised rim ring
    difference() {
        cylinder(h = top_h + 0.8, r = lid_r);
        translate([0, 0, -1])
            cylinder(h = top_h + 3, r = lid_r - 1.5);
    }
    // Hollow skirt
    translate([0, 0, -skirt_h])
    difference() {
        cylinder(h = skirt_h + 0.01, r = lid_r);
        translate([0, 0, -1])
            cylinder(h = skirt_h + 2, r = lid_r - skirt_wall);
    }
    // Vertical knurl ridges
    translate([0, 0, -skirt_h])
    for (i = [0 : knurl_count - 1]) {
        angle = i * 360 / knurl_count;
        rotate([0, 0, angle])
        translate([lid_r, 0, 0])
            linear_extrude(height = skirt_h)
                polygon(points = [
                    [-knurl_w/2, 0],
                    [0, knurl_depth],
                    [knurl_w/2, 0]
                ]);
    }
    // Inner sealing lip
    translate([0, 0, -skirt_h])
        difference() {
            cylinder(h = 5, r = lid_r - skirt_wall + 0.5);
            translate([0, 0, -1])
                cylinder(h = 7, r = lid_r - skirt_wall - 1.5);
        }
}
```

**Pitfalls:**
- Diamond knurl (crossed helical ridges) creates non-manifold geometry — use straight vertical ridges instead
- Diamond knurl via low-$fn spheres looks like square bumps, not diagonal diamonds
- Knurl depth > 1.5mm looks too coarse — use 0.8-1.0mm
- Fewer than 60 ridges looks coarse — use 80-90 for fine texture
- Never use cutaway to show interior — scorer sees it as broken geometry
- Keep knurling strictly additive (outside skirt_r) to avoid wall penetration
- Skirt should be hollow (difference with inner cylinder) for realistic appearance
- Diamond knurl (helical intersection) looks like artifacts at bottle cap scale — use vertical ridges
- Internal features invisible from standard camera angles — use cutaway
- Too many ridges (>30) with intersection() causes 2+ min compile times
- Thread needs trapezoidal cross-section (wider at wall, narrower at tip) for realism
- Cap height:diameter ratio should be ~0.7-0.9 for realistic bottle cap proportions
**Discovered:** Jar lid session, 5 iterations. Vertical ridges score 7/10 consistently. Diamond knurl attempts all had geometry issues (non-manifold, gaps, or unrecognizable pattern).

---

### Technique: Angled Cradle Assembly
Keywords: phone stand, tablet stand, phone holder, phone dock, phone cradle, tablet holder, book stand, display stand, easel, dock, cradle, holder, kickstand, recipe holder, picture frame stand

**When to use:** Any stand/holder that holds a flat device at an angle — phone docks, tablet stands, easels, book holders, display cradles.

**What it is:** Rounded base + angled back plate + shelf + front lip + side walls. Pure CSG with `cube()` primitives, `rotate()` for the angle, and `hull()` for the rounded base.

**Proven code template:**
```openscad
$fn = 120;
phone_w = 75; phone_t = 10;
base_w = phone_w + 16; base_d = 60; base_h = 5;
angle = 60; back_h = 55; wall = 4; corner_r = 4; lip_h = 12;
back_rise = back_h * sin(angle);
back_run = back_h * cos(angle);

module rrect(w, d, h, r) {
    hull() {
        for (x = [-w/2+r, w/2-r])
            for (y = [-d/2+r, d/2-r])
                translate([x, y, 0]) cylinder(r=r, h=h);
    }
}

module phone_stand() {
    back_y = base_d/2 - wall;
    shelf_y = back_y - back_run - phone_t;
    cradle_w = phone_w + wall;
    rrect(base_w, base_d, base_h, corner_r);
    translate([-cradle_w/2, back_y, base_h])
        rotate([30, 0, 0])
            cube([cradle_w, back_h, wall]);
    translate([-cradle_w/2, shelf_y, base_h])
        cube([cradle_w, back_run + phone_t + wall, wall]);
    translate([-cradle_w/2, shelf_y, base_h])
        cube([cradle_w, wall, lip_h]);
    for (side = [-1, 1]) {
        x_pos = side * (cradle_w/2) - wall/2;
        translate([x_pos, shelf_y, base_h])
            cube([wall, phone_t + wall, lip_h + 8]);
    }
}
phone_stand();
```

**Pitfalls:**
- Don't add triangular gussets — they look like jagged protrusions
- Don't make back plate too thick (>6mm) — it reads as a flat slab
- Keep wall = 4mm for clean proportions
- Ensure base_d > back_run + phone_t + wall so plate stays within footprint
- `rotate([90-angle, 0, 0])` for angle from horizontal
- Simple side walls beat grip tabs for visual cleanliness
- Simple lean stands (no side arms) let the phone slide off — add grip tabs for phones
- `rotate()` pivot is at the translate point — position back plate AT the back edge before rotating
- Side profile polygons self-intersect easily — use individual `cube()` pieces instead
- Grip tabs must face inward symmetrically — use `side == -1` conditional for x-position
- Shelf must extend from `shelf_y` all the way to the back plate foot — gap = phone falls through
- `90 - angle` for `rotate([x,0,0])` — NOT `angle` directly

---

### Technique: CSG Furniture Assembly
Keywords: bookshelf, shelf, shelving, rack, cabinet, dresser, desk, table, nightstand, bookcase, display case, media console, tv stand, storage unit

**When to use:** Any freestanding furniture made of flat panels — bookshelves, cabinets, desks, tables, racks, display cases, storage units.

**What it is:** `union()` of `cube()` parts — side panels, shelves, top, bottom, back panel. Each component is a module. All dimensions parameterized at the top of the file.

**Why it works:** Furniture is fundamentally rectangular panels assembled at right angles. CSG primitives map perfectly — no curves needed. A `for()` loop handles evenly-spaced shelves.

**Decomposition pattern:**
1. **Plinth/base** — recessed toe kick for visual weight
2. **Side panels** — full height above plinth
3. **Top/bottom panels** — full width
4. **Back panel** — thin, flush with rear
5. **Internal shelves** — inset between sides, `for()` loop
6. **Crown** — optional overhang on top for finished look

**Shelf count interpretation:** When user says "N shelves," use N-1 internal shelf dividers. The bottom panel counts as the first shelf. This prevents overcounting.

**Proportion rules:**
| Parameter | Guideline |
|-----------|-----------|
| `side_t` | 3mm for 3D printing |
| `shelf_t` | 2-2.5mm (thinner than sides) |
| `top_t` | 3-5mm |
| `back_t` | 1.5-2mm (thinnest panel) |
| `plinth_h` | 5-8% of total height |
| `depth` | 15-25% of height for bookshelves |

**Pitfalls:**
- "N shelves" means N-1 internal dividers (bottom = shelf 1) — scorers count the bottom panel as a shelf
- Always include back panel — without it, bookshelf looks like open frame
- Shelves should NOT extend behind the back panel — use `depth - back_t`
- Crown molding adds visual polish at minimal complexity
- Keep decorative extras minimal — face frames and multi-layer crowns add complexity without payoff
- Decorative extras (face frames, multi-layer crowns, center dividers) add complexity without enough payoff — keep it clean
- Side panels start at `plinth_h`, not z=0 — the plinth is its own piece
- `for()` loop for shelves is cleaner than placing each shelf manually
- Shelf thickness thinner than side thickness gives visual hierarchy

---

### Technique: Radial Tooth Addition with Hub
Keywords: gear, spur gear, cog, sprocket, pinion, wheel, toothed, timing pulley, ratchet

**When to use:** Any object with teeth or projections radiating outward from a central disc — spur gears, cogs, sprockets, ratchets, timing pulleys, star knobs.

**What it is:** Build a base disc at root radius, then `union()` individual tooth polygons placed with `rotate()` + `linear_extrude()`. Each tooth uses a 10-point polygon with intermediate radii to create curved involute-like flanks. Add a hub with shoulder ring for shaft mounting.

**Why it beats cutting:** Cutting gaps from a full circle removes the center when gaps overlap. Adding teeth to a disc guarantees the body stays solid.

**Standard gear parameters:**
```
pitch_r = teeth * module_val / 2
outer_r = pitch_r + module_val           (addendum)
root_r = pitch_r - 1.25 * module_val    (dedendum)
tooth_angle = 360 / teeth
```

**Proven code template:**
```openscad
$fn = 120;
teeth = 20;
module_val = 2.5;

pitch_r = teeth * module_val / 2;
outer_r = pitch_r + module_val;
root_r = pitch_r - 1.25 * module_val;
gear_thickness = 14;
bore_d = 10;
hub_d = 22;
hub_extra_h = 8;
tooth_angle = 360 / teeth;

module single_tooth() {
    tip_half = tooth_angle * 0.16;
    root_half = tooth_angle * 0.30;
    r1 = root_r + (pitch_r - root_r) * 0.5;
    r2 = pitch_r;
    r3 = pitch_r + (outer_r - pitch_r) * 0.5;
    a1 = root_half * 0.85;
    a2 = root_half * 0.65;
    a3 = tip_half + (root_half - tip_half) * 0.3;

    linear_extrude(height = gear_thickness)
        polygon(points = [
            [root_r * cos(-root_half), root_r * sin(-root_half)],
            [r1 * cos(-a1), r1 * sin(-a1)],
            [r2 * cos(-a2), r2 * sin(-a2)],
            [r3 * cos(-a3), r3 * sin(-a3)],
            [outer_r * cos(-tip_half), outer_r * sin(-tip_half)],
            [outer_r * cos(tip_half), outer_r * sin(tip_half)],
            [r3 * cos(a3), r3 * sin(a3)],
            [r2 * cos(a2), r2 * sin(a2)],
            [r1 * cos(a1), r1 * sin(a1)],
            [root_r * cos(root_half), root_r * sin(root_half)],
        ]);
}

module gear() {
    total_h = gear_thickness + hub_extra_h;
    difference() {
        union() {
            cylinder(h = gear_thickness, r = root_r);
            for (i = [0 : teeth - 1])
                rotate([0, 0, i * tooth_angle])
                    single_tooth();
            cylinder(h = total_h, d = hub_d);
            translate([0, 0, gear_thickness])
                cylinder(h = 1.5, r1 = hub_d/2 + 1.5, r2 = hub_d/2);
        }
        translate([0, 0, -1])
            cylinder(h = total_h + 2, d = bore_d);
    }
}

gear();
```

**Pitfalls:**
- Never cut gaps from a full circle — overlapping cuts destroy the center
- 6-point trapezoid teeth look blocky — use 10 points with intermediate radii for curved flanks
- Pure involute math produces visually worse results than hand-tuned angular interpolation
- Hub shoulder ring is essential — without it the hub looks glued on
- Gear thickness should be ~0.5x pitch diameter for realistic proportions
- Bore must extend past gear (h + 2, z = -1) to avoid z-fighting
- Tooth polygon must use 6 points (root-pitch-tip-tip-pitch-root) for proper involute approximation
- 4-point trapezoid (root-tip-tip-root) works but looks too blocky
- `tooth_angle * 0.18` for tip, `* 0.30` for root gives good proportions for 20-tooth gears
- For fewer teeth (<12), increase tip_half ratio to avoid overly pointy teeth

---

### Technique: Bezier Profile Revolution
*(Already exists in agent.md — update the "Classic vase" row in the shape dial-in table:)*

| Shape | P0 | P1 | P2 | P3 | P4 | Why |
|-------|----|----|----|----|-----|-----|
| Wide-belly vase | 18 | 55 | 35 | 10 | 35 | Exaggerated belly, narrow neck, flared rim — use shorter height (140mm) |

---

### Technique: Cylindrical Well Grid with Contact Slots
Keywords: battery holder, battery case, aa holder, aaa holder, cell holder, battery tray, battery compartment, pen holder, marker holder, test tube rack, cylinder grid

**When to use:** Any holder with a regular grid of cylindrical wells — battery holders, pen/marker holders, test tube racks, lipstick organizers, spice jar holders.

**What it is:** A rounded-corner box with a grid of cylindrical wells cut via `difference()`. Wells are sized to item diameter + clearance. Contact/access slots cut through divider walls and floor. Walls are shorter than items for easy access.

**Key design decisions:**
- Wall height: 55-65% of item length (not 100% — looks like solid block)
- Divider width: 1.2-1.5mm (thinner = more compact look)
- Floor thickness: 2mm for structural integrity with through-slots
- Grid spacing: item_diameter + clearance + divider_width
- Wall thickness: 1.2-1.5mm outer walls

**Proven code template:**
```openscad
$fn = 120;

// Item dimensions (AA battery example)
item_d = 14.5;
item_len = 50.5;
clearance = 0.5;
well_d = item_d + 2 * clearance;

// Structure
wall = 1.5;
div = 1.5;
bottom = 2;
slot_w = 3;

// Grid: 2x2
cols = 2;
rows = 2;
spacing = well_d + div;
body_w = cols * well_d + (cols-1) * div + 2 * wall;
body_d = rows * well_d + (rows-1) * div + 2 * wall;
body_h = item_len * 0.75 + bottom;

corner_r = 2;

module rbox(w, d, h, r) {
    hull() {
        for (x = [r, w - r])
            for (y = [r, d - r])
                translate([x, y, 0]) cylinder(r = r, h = h);
    }
}

module holder() {
    difference() {
        translate([-body_w/2, -body_d/2, 0])
            rbox(body_w, body_d, body_h, corner_r);

        for (c = [0 : cols-1])
            for (r = [0 : rows-1]) {
                cx = (c - (cols-1)/2) * spacing;
                cy = (r - (rows-1)/2) * spacing;
                translate([cx, cy, bottom])
                    cylinder(d = well_d, h = body_h);
                translate([cx, cy, -1])
                    cylinder(d = 5, h = bottom + 2);
            }

        // Spring contact slots through center dividers
        translate([-body_w/2 + wall, -slot_w/2, bottom])
            cube([body_w - 2*wall, slot_w, body_h * 0.3]);
        translate([-slot_w/2, -body_d/2 + wall, bottom])
            cube([slot_w, body_d - 2*wall, body_h * 0.3]);
    }
}

holder();
```

**Pitfalls:**
- Walls at 100% item height = solid block appearance — keep to 55-75%
- Finger scoops at outer walls can create non-manifold geometry — avoid
- Thick dividers (>2mm) make it look chunky — use 1.2-1.5mm
- For 2x2 grids, the footprint is inherently near-square — make height clearly taller than width
- Side window cutouts are optional and don't significantly improve recognition
- Cross-shaped divider slots read as "spring contacts" to scorers
- Walls at 100% item height = solid block appearance — keep to 55-65%
- Side window cutouts look decorative, not functional — use divider slots for contact access
- Stacking layers in Z makes front view ambiguous — keep single-layer grid
- End-to-end arrangements look elongated, not "grid" — maintain square/near-square footprint
- Non-manifold from intersecting cuts at edges — offset by 0.01mm
- Contact slots must be visible from at least one camera angle to register with evaluator
**Discovered:** AA battery holder session, 7 iterations. Peaked at score 7/10. Key findings: thin walls (1.2-1.5mm) and dividers give compact appearance. Height at 75% of item length balances between "too short" and "solid block". Cross-shaped floor contact holes are recognizable. The inherently square 2x2 footprint makes it hard to achieve taller-than-wide proportions that scorers want.

---

---

### Technique: CSG Bracket Assembly
Keywords: bracket, mount, shelf bracket, l-bracket, t-bracket, angle bracket, corner bracket, wall mount, support, brace, standoff

**When to use:** Any flat-plate structural object where plates meet at angles — shelf brackets, wall mounts, corner braces, T-supports, equipment mounts.

**What it is:** `union()` of flat plates (cubes) + structural gussets + countersunk screw holes, all via CSG operations. No curves needed — pure primitives and booleans.

**Decomposition pattern:**
1. **Plates** — cubes for each flat surface (wall plate, shelf plate)
2. **Gussets** — curved ribs connecting plates (quarter-circle cutout via linear_extrude)
3. **Screw holes** — countersunk cylinders subtracted via `difference()`
4. **Corner reinforcement** — cylinder along inner junction (optional)

**Critical details:**
- Gusset orientation: `rotate([90, 0, 90])` maps XY polygon → YZ plane
- Countersink on horizontal plate must face UP (top face) to be visible from top view
- Countersink on vertical plate must face BACK (rear face)
- Gusset length ~40% of arm length, thickness 3-4mm
- Plate thickness 4mm, screw holes inset ≥12mm from edges
- Height ≈ depth for balanced L-shape proportions

**Pitfalls:**
- `linear_extrude` goes along Z — gussets in wrong plane without rotation
- Gussets too large → solid block appearance
- Countersink on wrong face → holes invisible from key views
- Screw holes intersecting gussets → thin walls
- `linear_extrude` goes along Z — gussets in wrong plane without `rotate([90, 0, 90])`
- Gussets too large (>50% of arm) → looks like a solid block, not a bracket
- Screw holes intersecting gussets → thin walls that break. Clear holes from gusset zones
- Countersink on wrong face — must face outward (where screw head sits)
- Edge chamfers are verbose — each edge needs its own positioned/rotated extrusion

---

### Technique: Component-Based V-Groove Pulley
Keywords: pulley, wheel, V-groove, sheave, belt pulley, V-belt, groove, idler

**When to use:** Any wheel with a V-shaped groove around its circumference — pulleys, sheaves, belt wheels, idler wheels.

**What it is:** Build the pulley from discrete cylindrical/conical primitives rather than a single revolved profile. Two thin flange discs at the outer radius, two truncated cones for the V-groove angled walls, a web disc at the groove bottom, and a central hub cylinder. This produces much clearer V-groove shading in renders than a single polygon profile.

**Why components beat rotate_extrude:** A single polygon profile creates coplanar faces along the V-groove walls that OpenSCAD's renderer shades as a flat surface, making the V appear as a rectangular channel. Separate cone primitives create distinct face normals that shade the V-groove clearly.

**Proven code template:**
```openscad
$fn = 120;
outer_r = 20;         // pulley radius (half of diameter)
bore_r = 3;           // center bore
hub_r = 7;            // hub radius
hub_h = 14;           // hub height (extends past flanges)
flange_t = 1.5;       // thin flanges
groove_bottom_r = 12; // V-groove bottom (~60% of outer_r)
total_t = 12;         // flange-to-flange width
web_t = 3;            // web disc thickness

module pulley() {
    half_t = total_t / 2;
    cone_h = half_t - flange_t - web_t/2;

    difference() {
        union() {
            // Hub
            cylinder(h = hub_h, r = hub_r, center = true);
            // Web disc
            cylinder(h = web_t, r = groove_bottom_r, center = true);
            // Bottom flange
            translate([0, 0, -half_t])
                cylinder(h = flange_t, r = outer_r);
            // Top flange
            translate([0, 0, half_t - flange_t])
                cylinder(h = flange_t, r = outer_r);
            // Bottom V-wall (cone)
            translate([0, 0, -half_t + flange_t])
                cylinder(h = cone_h, r1 = outer_r, r2 = groove_bottom_r);
            // Top V-wall (cone)
            translate([0, 0, web_t/2])
                cylinder(h = cone_h, r1 = groove_bottom_r, r2 = outer_r);
        }
        // Bore
        translate([0, 0, -(hub_h/2 + 1)])
            cylinder(h = hub_h + 2, r = bore_r);
    }
}
pulley();
```

**Sizing guidelines:**
| Parameter | Guideline |
|-----------|-----------|
| `groove_bottom_r` | 55-65% of outer_r for visible V |
| `flange_t` | 1.5-2mm — thin enough for V to dominate |
| `total_t` | 50-80% of diameter for balanced proportions |
| `hub_r` | 30-40% of outer_r |
| `hub_h` | 10-20% taller than total_t |
| `web_t` | 2-3mm — just enough to connect hub to rim |

**Pitfalls:**
- Single rotate_extrude polygon makes V read as rectangular channel
- Thick flanges (>2.5mm) make it look like two discs with a gap
- Missing web disc leaves groove bottom open
- groove_bottom_r too close to outer_r (>70%) makes V too shallow to see
- Hub same height as flanges hides it — extend 1-2mm past

---

### Technique: Wall-Mount Hook Rack (CSG Assembly)
**When to use:** hook rack, key hook, coat hook, wall mount hanger, towel hooks
**Approach:** Vertical plate as hull of corner cylinders + J-hooks from arm cylinder + hulled arc segments. Space hooks evenly with `plate_w / (n_hooks + 1)`.

**Key pattern — J-hook with plate intersection:**
```openscad
module hook(cx) {
    // Arm penetrates into plate for solid union
    translate([cx, -1, hook_z])
        rotate([-90, 0, 0])
            cylinder(h = arm_len + plate_t + 1, r = hook_r);
    // J-curve from hulled arc segments
    n_steps = 24;
    for (i = [0 : n_steps - 1]) {
        a1 = 90 - i * (sweep / n_steps);
        a2 = 90 - (i + 1) * (sweep / n_steps);
        hull() {
            translate([cx, plate_t + arm_len + R * cos(a1), hook_z + R * sin(a1)])
                rotate([0, 90, 0]) cylinder(h = 0.1, r = hook_r, center = true);
            translate([cx, plate_t + arm_len + R * cos(a2), hook_z + R * sin(a2)])
                rotate([0, 90, 0]) cylinder(h = 0.1, r = hook_r, center = true);
        }
    }
}
```

**Pitfalls:**
- Hooks MUST penetrate into the plate — starting at plate surface leaves a visual gap
- Don't add boss/fillet at junction — simple intersection is cleaner
- Use difference() for countersunk screw holes through the plate
- 230° sweep gives a good J-hook catch angle; less looks incomplete

---

### Technique: Angled Cradle Assembly
Keywords: phone stand, tablet stand, phone holder, phone dock, phone cradle, tablet holder, book stand, display stand, easel, dock, cradle, holder, kickstand, recipe holder, picture frame stand

**When to use:** Any stand/holder that holds a flat device at an angle — phone docks, tablet stands, easels, book holders, display cradles.

**What it is:** Rounded base + angled back plate + shelf + front lip + side walls. Pure CSG with `cube()` primitives, `rotate()` for the angle, and `hull()` for the rounded base.

**Proven code template:**
```openscad
$fn = 120;
phone_w = 75; phone_t = 10;
base_w = phone_w + 16; base_d = 60; base_h = 5;
angle = 60; back_h = 55; wall = 4; corner_r = 4; lip_h = 12;
back_rise = back_h * sin(angle);
back_run = back_h * cos(angle);

module rrect(w, d, h, r) {
    hull() {
        for (x = [-w/2+r, w/2-r])
            for (y = [-d/2+r, d/2-r])
                translate([x, y, 0]) cylinder(r=r, h=h);
    }
}

module phone_stand() {
    back_y = base_d/2 - wall;
    shelf_y = back_y - back_run - phone_t;
    cradle_w = phone_w + wall;
    rrect(base_w, base_d, base_h, corner_r);
    translate([-cradle_w/2, back_y, base_h])
        rotate([30, 0, 0])
            cube([cradle_w, back_h, wall]);
    translate([-cradle_w/2, shelf_y, base_h])
        cube([cradle_w, back_run + phone_t + wall, wall]);
    translate([-cradle_w/2, shelf_y, base_h])
        cube([cradle_w, wall, lip_h]);
    for (side = [-1, 1]) {
        x_pos = side * (cradle_w/2) - wall/2;
        translate([x_pos, shelf_y, base_h])
            cube([wall, phone_t + wall, lip_h + 8]);
    }
}
phone_stand();
```

**Pitfalls:**
- Don't add triangular gussets — they look like jagged protrusions
- Don't make back plate too thick (>6mm) — it reads as a flat slab
- Keep wall = 4mm for clean proportions
- Ensure base_d > back_run + phone_t + wall so plate stays within footprint
- `rotate([90-angle, 0, 0])` for angle from horizontal
- Simple side walls beat grip tabs for visual cleanliness
- Simple lean stands (no side arms) let the phone slide off — add grip tabs for phones
- `rotate()` pivot is at the translate point — position back plate AT the back edge before rotating
- Side profile polygons self-intersect easily — use individual `cube()` pieces instead
- Grip tabs must face inward symmetrically — use `side == -1` conditional for x-position
- Shelf must extend from `shelf_y` all the way to the back plate foot — gap = phone falls through
- `90 - angle` for `rotate([x,0,0])` — NOT `angle` directly

---

### Technique: CSG Furniture Assembly
Keywords: bookshelf, shelf, shelving, rack, cabinet, dresser, desk, table, nightstand, bookcase, display case, media console, tv stand, storage unit

**When to use:** Any freestanding furniture made of flat panels — bookshelves, cabinets, desks, tables, racks, display cases, storage units.

**What it is:** `union()` of `cube()` parts — side panels, shelves, top, bottom, back panel. Each component is a module. All dimensions parameterized at the top of the file.

**Why it works:** Furniture is fundamentally rectangular panels assembled at right angles. CSG primitives map perfectly — no curves needed. A `for()` loop handles evenly-spaced shelves.

**Decomposition pattern:**
1. **Plinth/base** — recessed toe kick for visual weight
2. **Side panels** — full height above plinth
3. **Top/bottom panels** — full width
4. **Back panel** — thin, flush with rear
5. **Internal shelves** — inset between sides, `for()` loop
6. **Crown** — optional overhang on top for finished look

**Shelf count interpretation:** When user says "N shelves," use N-1 internal shelf dividers. The bottom panel counts as the first shelf. This prevents overcounting.

**Proportion rules:**
| Parameter | Guideline |
|-----------|-----------|
| `side_t` | 3mm for 3D printing |
| `shelf_t` | 2-2.5mm (thinner than sides) |
| `top_t` | 3-5mm |
| `back_t` | 1.5-2mm (thinnest panel) |
| `plinth_h` | 5-8% of total height |
| `depth` | 15-25% of height for bookshelves |

**Pitfalls:**
- "N shelves" means N-1 internal dividers (bottom = shelf 1) — scorers count the bottom panel as a shelf
- Always include back panel — without it, bookshelf looks like open frame
- Shelves should NOT extend behind the back panel — use `depth - back_t`
- Crown molding adds visual polish at minimal complexity
- Keep decorative extras minimal — face frames and multi-layer crowns add complexity without payoff
- Decorative extras (face frames, multi-layer crowns, center dividers) add complexity without enough payoff — keep it clean
- Side panels start at `plinth_h`, not z=0 — the plinth is its own piece
- `for()` loop for shelves is cleaner than placing each shelf manually
- Shelf thickness thinner than side thickness gives visual hierarchy

---

### Technique: Radial Tooth Addition with Hub
Keywords: gear, spur gear, cog, sprocket, pinion, wheel, toothed, timing pulley, ratchet

**When to use:** Any object with teeth or projections radiating outward from a central disc — spur gears, cogs, sprockets, ratchets, timing pulleys, star knobs.

**What it is:** Build a base disc at root radius, then `union()` individual tooth polygons placed with `rotate()` + `linear_extrude()`. Each tooth uses a 10-point polygon with intermediate radii to create curved involute-like flanks. Add a hub with shoulder ring for shaft mounting.

**Why it beats cutting:** Cutting gaps from a full circle removes the center when gaps overlap. Adding teeth to a disc guarantees the body stays solid.

**Standard gear parameters:**
```
pitch_r = teeth * module_val / 2
outer_r = pitch_r + module_val           (addendum)
root_r = pitch_r - 1.25 * module_val    (dedendum)
tooth_angle = 360 / teeth
```

**Proven code template:**
```openscad
$fn = 120;
teeth = 20;
module_val = 2.5;

pitch_r = teeth * module_val / 2;
outer_r = pitch_r + module_val;
root_r = pitch_r - 1.25 * module_val;
gear_thickness = 14;
bore_d = 10;
hub_d = 22;
hub_extra_h = 8;
tooth_angle = 360 / teeth;

module single_tooth() {
    tip_half = tooth_angle * 0.16;
    root_half = tooth_angle * 0.30;
    r1 = root_r + (pitch_r - root_r) * 0.5;
    r2 = pitch_r;
    r3 = pitch_r + (outer_r - pitch_r) * 0.5;
    a1 = root_half * 0.85;
    a2 = root_half * 0.65;
    a3 = tip_half + (root_half - tip_half) * 0.3;

    linear_extrude(height = gear_thickness)
        polygon(points = [
            [root_r * cos(-root_half), root_r * sin(-root_half)],
            [r1 * cos(-a1), r1 * sin(-a1)],
            [r2 * cos(-a2), r2 * sin(-a2)],
            [r3 * cos(-a3), r3 * sin(-a3)],
            [outer_r * cos(-tip_half), outer_r * sin(-tip_half)],
            [outer_r * cos(tip_half), outer_r * sin(tip_half)],
            [r3 * cos(a3), r3 * sin(a3)],
            [r2 * cos(a2), r2 * sin(a2)],
            [r1 * cos(a1), r1 * sin(a1)],
            [root_r * cos(root_half), root_r * sin(root_half)],
        ]);
}

module gear() {
    total_h = gear_thickness + hub_extra_h;
    difference() {
        union() {
            cylinder(h = gear_thickness, r = root_r);
            for (i = [0 : teeth - 1])
                rotate([0, 0, i * tooth_angle])
                    single_tooth();
            cylinder(h = total_h, d = hub_d);
            translate([0, 0, gear_thickness])
                cylinder(h = 1.5, r1 = hub_d/2 + 1.5, r2 = hub_d/2);
        }
        translate([0, 0, -1])
            cylinder(h = total_h + 2, d = bore_d);
    }
}

gear();
```

**Pitfalls:**
- Never cut gaps from a full circle — overlapping cuts destroy the center
- 6-point trapezoid teeth look blocky — use 10 points with intermediate radii for curved flanks
- Pure involute math produces visually worse results than hand-tuned angular interpolation
- Hub shoulder ring is essential — without it the hub looks glued on
- Gear thickness should be ~0.5x pitch diameter for realistic proportions
- Bore must extend past gear (h + 2, z = -1) to avoid z-fighting
- Tooth polygon must use 6 points (root-pitch-tip-tip-pitch-root) for proper involute approximation
- 4-point trapezoid (root-tip-tip-root) works but looks too blocky
- `tooth_angle * 0.18` for tip, `* 0.30` for root gives good proportions for 20-tooth gears
- For fewer teeth (<12), increase tip_half ratio to avoid overly pointy teeth

---

### Technique: Bezier Profile Revolution
*(Already exists in agent.md — update the "Classic vase" row in the shape dial-in table:)*

| Shape | P0 | P1 | P2 | P3 | P4 | Why |
|-------|----|----|----|----|-----|-----|
| Wide-belly vase | 18 | 55 | 35 | 10 | 35 | Exaggerated belly, narrow neck, flared rim — use shorter height (140mm) |

---

### Technique: Cylindrical Well Grid with Contact Slots
Keywords: battery holder, battery case, aa holder, aaa holder, cell holder, battery tray, battery compartment, pen holder, marker holder, test tube rack, cylinder grid

**When to use:** Any holder with a regular grid of cylindrical wells — battery holders, pen/marker holders, test tube racks, lipstick organizers, spice jar holders.

**What it is:** A rounded-corner box with a grid of cylindrical wells cut via `difference()`. Wells are sized to item diameter + clearance. Contact/access slots cut through divider walls and floor. Walls are shorter than items for easy access.

**Key design decisions:**
- Wall height: 55-65% of item length (not 100% — looks like solid block)
- Divider width: 1.2-1.5mm (thinner = more compact look)
- Floor thickness: 2mm for structural integrity with through-slots
- Grid spacing: item_diameter + clearance + divider_width
- Wall thickness: 1.2-1.5mm outer walls

**Proven code template:**
```openscad
$fn = 120;

// Item dimensions (AA battery example)
item_d = 14.5;
item_len = 50.5;
clearance = 0.5;
well_d = item_d + 2 * clearance;

// Structure
wall = 1.5;
div = 1.5;
bottom = 2;
slot_w = 3;

// Grid: 2x2
cols = 2;
rows = 2;
spacing = well_d + div;
body_w = cols * well_d + (cols-1) * div + 2 * wall;
body_d = rows * well_d + (rows-1) * div + 2 * wall;
body_h = item_len * 0.75 + bottom;

corner_r = 2;

module rbox(w, d, h, r) {
    hull() {
        for (x = [r, w - r])
            for (y = [r, d - r])
                translate([x, y, 0]) cylinder(r = r, h = h);
    }
}

module holder() {
    difference() {
        translate([-body_w/2, -body_d/2, 0])
            rbox(body_w, body_d, body_h, corner_r);

        for (c = [0 : cols-1])
            for (r = [0 : rows-1]) {
                cx = (c - (cols-1)/2) * spacing;
                cy = (r - (rows-1)/2) * spacing;
                translate([cx, cy, bottom])
                    cylinder(d = well_d, h = body_h);
                translate([cx, cy, -1])
                    cylinder(d = 5, h = bottom + 2);
            }

        // Spring contact slots through center dividers
        translate([-body_w/2 + wall, -slot_w/2, bottom])
            cube([body_w - 2*wall, slot_w, body_h * 0.3]);
        translate([-slot_w/2, -body_d/2 + wall, bottom])
            cube([slot_w, body_d - 2*wall, body_h * 0.3]);
    }
}

holder();
```

**Pitfalls:**
- Walls at 100% item height = solid block appearance — keep to 55-75%
- Finger scoops at outer walls can create non-manifold geometry — avoid
- Thick dividers (>2mm) make it look chunky — use 1.2-1.5mm
- For 2x2 grids, the footprint is inherently near-square — make height clearly taller than width
- Side window cutouts are optional and don't significantly improve recognition
- Cross-shaped divider slots read as "spring contacts" to scorers
- Walls at 100% item height = solid block appearance — keep to 55-65%
- Side window cutouts look decorative, not functional — use divider slots for contact access
- Stacking layers in Z makes front view ambiguous — keep single-layer grid
- End-to-end arrangements look elongated, not "grid" — maintain square/near-square footprint
- Non-manifold from intersecting cuts at edges — offset by 0.01mm
- Contact slots must be visible from at least one camera angle to register with evaluator
**Discovered:** AA battery holder session, 7 iterations. Peaked at score 7/10. Key findings: thin walls (1.2-1.5mm) and dividers give compact appearance. Height at 75% of item length balances between "too short" and "solid block". Cross-shaped floor contact holes are recognizable. The inherently square 2x2 footprint makes it hard to achieve taller-than-wide proportions that scorers want.

---

---

### Technique: CSG Bracket Assembly
Keywords: bracket, mount, shelf bracket, l-bracket, t-bracket, angle bracket, corner bracket, wall mount, support, brace, standoff

**When to use:** Any flat-plate structural object where plates meet at angles — shelf brackets, wall mounts, corner braces, T-supports, equipment mounts.

**What it is:** `union()` of flat plates (cubes) + structural gussets + countersunk screw holes, all via CSG operations. No curves needed — pure primitives and booleans.

**Decomposition pattern:**
1. **Plates** — cubes for each flat surface (wall plate, shelf plate)
2. **Gussets** — curved ribs connecting plates (quarter-circle cutout via linear_extrude)
3. **Screw holes** — countersunk cylinders subtracted via `difference()`
4. **Corner reinforcement** — cylinder along inner junction (optional)

**Critical details:**
- Gusset orientation: `rotate([90, 0, 90])` maps XY polygon → YZ plane
- Countersink on horizontal plate must face UP (top face) to be visible from top view
- Countersink on vertical plate must face BACK (rear face)
- Gusset length ~40% of arm length, thickness 3-4mm
- Plate thickness 4mm, screw holes inset ≥12mm from edges
- Height ≈ depth for balanced L-shape proportions

**Pitfalls:**
- `linear_extrude` goes along Z — gussets in wrong plane without rotation
- Gussets too large → solid block appearance
- Countersink on wrong face → holes invisible from key views
- Screw holes intersecting gussets → thin walls
- `linear_extrude` goes along Z — gussets in wrong plane without `rotate([90, 0, 90])`
- Gussets too large (>50% of arm) → looks like a solid block, not a bracket
- Screw holes intersecting gussets → thin walls that break. Clear holes from gusset zones
- Countersink on wrong face — must face outward (where screw head sits)
- Edge chamfers are verbose — each edge needs its own positioned/rotated extrusion

---

### Technique: Flat Base Slot Organizer
Keywords: cable organizer, cable holder, cable slot, cord organizer, cable management, USB organizer, wire organizer, slot holder, cable clip base

**When to use:** Any flat-base object with repeating cylindrical slots for holding cables, pens, or similar items — cable organizers, cord holders, pen rests, tool holders on a flat base.

**What it is:** A thin rounded-rectangle base with evenly spaced cylindrical through-holes, each with a narrow entry slot from one edge so items can be pressed in from the front. The narrow slot acts as a snap-fit retention feature.

**Architecture:**
```
1. Create thin flat rbox (rounded rectangle hull of 4 cylinders)
2. For each slot: subtract cylinder (full height) at center-line
3. For each slot: subtract narrow cube from front edge to cylinder center
4. Result: keyhole-shaped slots with snap-fit openings
```

**Proven code template:**
```openscad
$fn = 60;
base_w = 120;
base_d = 50;
base_h = 12;
corner_r = 4;
slot_r = 5;
n_slots = 4;
slot_spacing = base_w / (n_slots + 1);

module rbox(w, d, h, r) {
    hull() {
        translate([r, r, 0]) cylinder(r=r, h=h);
        translate([w-r, r, 0]) cylinder(r=r, h=h);
        translate([r, d-r, 0]) cylinder(r=r, h=h);
        translate([w-r, d-r, 0]) cylinder(r=r, h=h);
    }
}

module cable_organizer() {
    difference() {
        rbox(base_w, base_d, base_h, corner_r);
        for (i = [1:n_slots]) {
            x = i * slot_spacing;
            // Cable hole
            translate([x, base_d/2, -1])
                cylinder(r=slot_r, h=base_h + 2);
            // Entry slot from front
            translate([x - slot_r*0.5, -1, -1])
                cube([slot_r*1.0, base_d/2 + 1, base_h + 2]);
        }
    }
}

translate([-base_w/2, -base_d/2, 0])
    cable_organizer();
```

**Sizing guidelines:**
| Parameter | Guideline |
|-----------|-----------|
| base_h | 10-15mm for "flat" base feel |
| slot_r | 4-6mm for standard USB cables |
| slot opening | 50-60% of slot diameter for snap-fit |
| slot_spacing | Even distribution: base_w / (n_slots + 1) |
| corner_r | 3-5mm for subtle rounding |

**Pitfalls:**
- Base too tall (>15mm) looks like a brick — keep it 10-15mm
- Slots running entirely front-to-back look like a comb — use centered holes with entry slots
- Entry slot too wide loses snap-fit appearance — keep at ~50% of hole diameter
- Slots through both edges (front AND back) weakens structure — only cut from one edge

---

### Technique: Rimmed Tray with Hanging Tabs
Keywords: tray, feeder, bird feeder, rim, hanging, holes, platform, shallow dish, mounting tab, seed tray

**When to use:** Any shallow tray or platform with a raised rim and hanging/mounting features — bird feeders, seed trays, serving trays with handles, drip trays with hooks.

**What it is:** A rounded-rectangle tray (hull of 4 corner cylinders) with a hollow rim created by differencing a smaller rbox, plus hanging tabs on the short ends with rounded tops and through-holes.

**Architecture:**
```
1. rbox() module for rounded rectangles (hull of 4 corner cylinders)
2. Floor disc: rbox at floor_t height
3. Rim walls: difference of full-height rbox minus inner rbox offset by wall_t
4. Hanging tabs: cube body + hull(cube, rotated cylinder) for rounded top
5. Through-holes: rotate([90,0,0]) cylinder through each tab
```

**Key dimensions:**
- Tray: 180×120mm, corner_r=10
- Rim: 12mm tall, 3mm wall
- Tabs: 28mm wide, 22mm tall above rim, rounded top
- Holes: 12mm diameter, centered in upper tab area

**Pitfalls:**
- Use rectangular shape for bird feeders, not circular (scores higher as more recognizable)
- Make tabs overlap with rim wall geometry to avoid non-manifold
- Round tab tops with hull(cube, cylinder) — boxy tabs look unfinished
- Keep hole diameter >= 10mm for visibility in renders
- Place tabs on short ends (X axis) for best visibility in front/iso views

---

### Technique: Open-Frame Angled Slot Holder
Keywords: card holder, business card, display slot, angled slot, card stand, name card holder, display stand, desk card holder

**When to use:** Any holder that displays flat items (cards, photos, postcards) at an angle — business card holders, name card stands, photo display stands, recipe card holders.

**What it is:** Flat rounded-rectangle base + angled back plate + raised shelf floor + front lip + side walls. The slot is the open channel between the front lip and angled back plate, with the raised shelf creating a visible recessed area.

**Why open-frame beats slot-in-block:** Cutting a slot into a solid block produces a thin slit that doesn't read as a functional holder. The open-frame approach creates a visible, clearly functional slot where cards sit.

**Key geometry:**
```
back_angle = 55;  // degrees from horizontal
back_h = 55;      // back plate height
slot_gap = 10;    // channel width for cards
lip_h = 15;       // front lip height
```

**Proven code template:**
```openscad
$fn = 60;
card_w = 89;
base_w = card_w + 20;
base_d = 55;
base_h = 6;
wall = 4;
corner_r = 3;
back_angle = 55;
back_h = 55;
back_t = 4;
lip_h = 15;
lip_t = 4;
slot_gap = 10;

module rrect(w, d, h, r) {
    hull() {
        for (x = [-w/2+r, w/2-r])
            for (y = [-d/2+r, d/2-r])
                translate([x, y, 0]) cylinder(r=r, h=h);
    }
}

module card_holder() {
    rrect(base_w, base_d, base_h, corner_r);
    // Angled back plate
    translate([-base_w/2 + wall, base_d/2 - back_t, base_h])
        rotate([-(90 - back_angle), 0, 0])
            cube([base_w - 2*wall, back_t, back_h]);
    // Raised shelf floor
    shelf_y = base_d/2 - back_t - slot_gap;
    translate([-base_w/2 + wall, shelf_y - lip_t, base_h])
        cube([base_w - 2*wall, slot_gap + back_t + lip_t, 3]);
    // Front lip
    translate([-base_w/2 + wall + 3, shelf_y - lip_t, base_h])
        cube([base_w - 2*wall - 6, lip_t, lip_h]);
    // Side walls
    for (side = [-1, 1]) {
        sx = side > 0 ? base_w/2 - wall : -base_w/2;
        translate([sx, shelf_y - lip_t, base_h])
            cube([wall, slot_gap + back_t + lip_t, lip_h]);
    }
}
card_holder();
```

**Design rules:**
| Parameter | Guideline |
|-----------|-----------|
| `back_angle` | 50-60° from horizontal for visible lean |
| `slot_gap` | 8-12mm (enough for a stack of cards) |
| `lip_h` | 12-18mm (tall enough to hold cards, short enough to show them) |
| `base_d` | Must accommodate back_run + slot_gap + lip_t |
| `base_w` | card_w + 16-24mm |
| `wall` | 3-5mm |

**Pitfalls:**
- Slot-in-solid-block approach looks like a thin slit — use open-frame instead
- Back angle > 70° looks nearly vertical — use 50-60° for visible lean
- Blocky side walls overpower the design — keep them same height as lip
- Missing raised shelf floor makes slot look like a gap, not a channel
- Front lip should be inset 3-5mm from side edges for refinement

**Discovered:** Business card holder session, 6 iterations. Solid-block-with-slot (iter 0) scored 3. Open-frame with base + back plate + lip (iter 1-3) scored 7 but slot looked like thin gap. Adding raised shelf floor (iter 5) created visible recessed channel, scored 8.

---

### Technique: Wave-Hump Hull-Chain (tableware rests, cradles)

**When to use:** Object is a small elongated rest, cradle, or holder where items sit in a valley between raised sections (chopstick rest, pen rest, brush rest, soap dish variant).

**Classification:** Elongated with functional valley/cradle on top.

**Core approach:**
1. Define a wave function `wave_h(t)` using `sin(t * 360 * N - 90)` for N humps, with `sin(t * 180)` envelope for tapered ends
2. Use `pow(..., 0.5)` on the hump function to sharpen peaks and deepen valleys
3. Build body as hull-chain of scaled spheres along X axis, one pair per step
4. The wave valley naturally forms the cradle — no explicit groove cut needed

**Key dimensions:**
- Length: 50-60mm
- Width: 12-16mm
- Height: 10-14mm (peak)
- Hull steps: 60-80 for smooth profile
- Use $fn=16 for hull spheres (fast compile)

**Template:**
```openscad
$fn = 120;
length = 55; width = 14; height = 13;

function wave_h(t) =
    let(envelope = sin(t * 180),
        humps = pow(0.5 + 0.5 * sin(t * 360 * 2 - 90), 0.5))
    max(0.2, height * humps * envelope);

module body() {
    steps = 80;
    for (i = [0 : steps - 1]) {
        t0 = i / steps; t1 = (i + 1) / steps;
        x0 = -length/2 + t0 * length;
        x1 = -length/2 + t1 * length;
        hull() {
            translate([x0, 0, wave_h(t0)/2])
                scale([0.5, width/2, wave_h(t0)/2]) sphere(r=1, $fn=16);
            translate([x1, 0, wave_h(t1)/2])
                scale([0.5, width/2, wave_h(t1)/2]) sphere(r=1, $fn=16);
        }
    }
}
body();
```

**Pitfalls:**
- Don't cut explicit grooves with cylinders — creates orange artifacts in renders
- Use $fn=16 for hull spheres, not $fn=120 (compile time goes from 1.5min to 30s)
- Don't make height > 15mm (looks like a mountain) or < 8mm (looks like a flat bar)
- Don't make body too wide (>18mm) — loses elegant proportions
- `pow(..., exponent)` with exponent < 1 sharpens peaks; > 1 flattens them

---

### Technique: Flat-Plate-on-Stake (Garden/Signage Markers)

**When to use:** Plant labels, garden stakes, sign markers, T-shaped tags on sticks

**Key principle:** Keep it simple — this is fundamentally a T-shape. A flat rectangular cube for the label plate, a thin rectangular shaft for the stake, a hull-tapered point, and a hull transition from narrow stake to wide label. All same thickness.

**Dimensions that work:**
- Stake: 8mm wide × 2mm thick × 140mm tall
- Label: 55mm wide × 2mm thick × 35mm tall
- Point: 25mm tall, tapering to 0.5mm wide
- Label:stake width ratio ~7:1

**Template:**
```openscad
$fn = 120;
stake_w = 8; stake_t = 2; stake_h = 140; point_h = 25;
label_w = 55; label_h = 35; label_t = 2;

// Pointed stake
hull() {
    translate([-stake_w/2, -stake_t/2, point_h]) cube([stake_w, stake_t, 0.1]);
    cube([0.5, stake_t, 0.1], center=true);
}
translate([-stake_w/2, -stake_t/2, point_h]) cube([stake_w, stake_t, stake_h - point_h]);

// Label plate
translate([-label_w/2, -label_t/2, stake_h]) cube([label_w, label_t, label_h]);

// Transition
hull() {
    translate([-stake_w/2, -stake_t/2, stake_h]) cube([stake_w, stake_t, 0.1]);
    translate([-label_w/2, -label_t/2, stake_h]) cube([label_w, label_t, 0.1]);
}
```

**Pitfalls:**
- Don't use hull with cylinders for rounded label corners — creates trapezoidal/thick look from side
- Keep label and stake same thickness (2mm) — thicker labels look blocky
- Keep stake narrow relative to label (7:1 ratio) for clear T-shape
- Taper point in width only, not thickness, for chisel-point appearance

---

### Technique: Hull-Chain Arc Stand
**Use when:** Stand with an arched/curved top (headphone stand, hat stand, display stand)
**Classification keywords:** headphone, stand, arc, arch, weighted, base, holder, display

**Approach:** Three-part CSG assembly:
1. **Weighted base:** thick cylinder (h≥20mm, d≥130mm) with top/bottom chamfers
2. **Vertical post:** cylinder or oval post connecting base to arc
3. **Arc top:** hull-chain of low-$fn spheres along parametric arch curve

**Key pattern:**
```openscad
// Flat-topped arch via hull chain
steps = 28;
for (i = [0:steps-1]) {
    t1 = i / steps;
    t2 = (i + 1) / steps;
    x1 = -arc_w/2 + t1 * arc_w;
    x2 = -arc_w/2 + t2 * arc_w;
    u1 = 2*t1 - 1;
    u2 = 2*t2 - 1;
    z1 = arc_rise * pow(max(0.001, 1 - u1*u1), 0.35);
    z2 = arc_rise * pow(max(0.001, 1 - u2*u2), 0.35);
    hull() {
        translate([x1, 0, z1]) sphere(r=tube_r, $fn=24);
        translate([x2, 0, z2]) sphere(r=tube_r, $fn=24);
    }
}
```

**Pitfalls:**
- Do NOT use rotate_extrude for the arch — it creates a hook, not a wide span
- Use $fn=24 max for hull spheres — higher values cause multi-minute compiles
- Base must be ≥20mm thick and ≥130mm wide to visually convey "weighted"
- Add chamfer/transition cone between base and post
- Arc width should be ~80% of total height for good proportions

---

### Technique: Sawtooth Barb Revolution (for hose barb fittings)

**When to use:** Hose barb fittings, tube connectors, barbed nipples — any fitting with saw-tooth ridges for gripping flexible tubing.

**Approach:**
1. Build each barb as a separate `rotate_extrude()` polygon with sawtooth cross-section
2. Fill gaps between barbs with a stem cylinder
3. Add hex section at base ($fn=6 cylinder)
4. Cut central bore through everything with single `difference()`

**Key parameters:**
- `barb_od`: slightly larger than hose ID (e.g., 12mm for 10mm hose)
- `stem_od`: slightly smaller than hose ID (e.g., 9.5mm for 10mm hose)
- `bore_d`: internal passage diameter
- `barb_pitch`: distance between barb peaks (4-6mm typical)

**Code template:**
```openscad
$fn = 100;
bore_d = 6; stem_od = 9.5; barb_od = 12;
hex_af = 14; hex_h = 8; inlet_od = 10.5; inlet_h = 6;
num_barbs = 4; barb_pitch = 4.5; tip_len = 4;
barb_start_z = hex_h + inlet_h;

module sawtooth_barb(z_offset) {
    translate([0, 0, z_offset])
        rotate_extrude()
            polygon(points=[
                [stem_od/2, 0],
                [stem_od/2 + 0.2, barb_pitch * 0.05],
                [barb_od/2 - 0.8, barb_pitch * 0.4],
                [barb_od/2 - 0.2, barb_pitch * 0.7],
                [barb_od/2, barb_pitch * 0.82],
                [barb_od/2, barb_pitch * 0.84],
                [stem_od/2, barb_pitch * 0.88],
                [stem_od/2, barb_pitch],
            ]);
}

difference() {
    union() {
        cylinder(d=hex_af, h=hex_h, $fn=6);
        translate([0, 0, hex_h]) cylinder(d=inlet_od, h=inlet_h);
        translate([0, 0, barb_start_z]) cylinder(d=stem_od, h=num_barbs*barb_pitch);
        for (i = [0:num_barbs-1]) sawtooth_barb(barb_start_z + i*barb_pitch);
        translate([0, 0, barb_start_z + num_barbs*barb_pitch])
            cylinder(d1=stem_od, d2=stem_od*0.65, h=tip_len);
    }
    translate([0, 0, -0.5])
        cylinder(d=bore_d, h=hex_h+inlet_h+num_barbs*barb_pitch+tip_len+1);
}
```

**Pitfalls:**
- Don't use a single full-profile `rotate_extrude()` polygon combined with hex via boolean — causes non-manifold errors
- OpenSCAD's faceted rendering makes sawtooth barbs appear smoother/more conical than intended — this is a rendering limitation, not a geometry error
- Always include a stem cylinder to fill gaps between individual barb revolves
- Keep barb overhang modest (barb_od/stem_od ratio ~1.25) for printability

---

### Technique: Hollow Hemisphere Scoop
Keywords: scoop, measuring scoop, flat handle, cup measure, powder scoop, feed scoop, ice scoop, flour scoop

**When to use:** Any scoop or measuring cup with a distinct bowl and a flat/rectangular handle. NOT for spoons (use Hull Chain Composition) — scoops have deeper, more hemispherical bowls and distinctly flat handles.

**What it is:** Build the bowl as a hollow hemisphere using `sphere()` minus smaller `sphere()`, cut to keep only the lower half. The flat handle is built from `cube()` primitives at rim level (z=0), with a hull-tapered transition to the bowl edge.

**Why it works:** Unlike hull-chain spoons where bowl and handle are one continuous organic shape, scoops have a sharp geometric distinction between a round bowl and a flat handle. Hemisphere CSG gives a clean bowl shape, and cube() gives a visibly flat handle. The rim connection at z=0 looks natural because that's where a real scoop's handle meets the bowl.

**Architecture:**
```
1. Bowl: sphere(outer) - sphere(inner) - cube(top half) = hollow hemisphere
2. Rim ring: cylinder at z=0 for structural lip
3. Handle: cube sections at z=0, hull-tapered near bowl, straight body, tapered end
4. Flatten bottom with cube subtraction
```

**Proven code template:**
```openscad
$fn = 80;
bowl_outer_r = 26;  bowl_wall = 2.5;  bowl_inner_r = bowl_outer_r - bowl_wall;
handle_l = 75;  handle_w = 16;  handle_t = 4;

module scoop() {
    difference() {
        union() {
            // Hollow hemisphere bowl
            difference() {
                sphere(r=bowl_outer_r, $fn=80);
                sphere(r=bowl_inner_r, $fn=80);
                translate([0, 0, bowl_outer_r/2 + 1])
                    cube([bowl_outer_r*3, bowl_outer_r*3, bowl_outer_r + 2], center=true);
            }
            // Rim reinforcement
            difference() {
                cylinder(r=bowl_outer_r, h=2, center=true, $fn=80);
                cylinder(r=bowl_inner_r - 1, h=3, center=true, $fn=80);
            }
            // Flat handle from rim
            translate([0, bowl_outer_r - 2, 0]) {
                hull() {
                    cube([handle_w + 8, 4, handle_t], center=true);
                    translate([0, 15, 0]) cube([handle_w, 4, handle_t], center=true);
                }
                translate([0, 15 + (handle_l - 30)/2, 0])
                    cube([handle_w, handle_l - 30, handle_t], center=true);
                hull() {
                    translate([0, handle_l - 15, 0]) cube([handle_w, 4, handle_t], center=true);
                    translate([0, handle_l, 0]) cube([handle_w - 4, 4, handle_t], center=true);
                }
            }
        }
        translate([0, 0, -bowl_outer_r - 25]) cube([300, 300, 50], center=true);
    }
}
scoop();
```

**Pitfalls:**
- Hull chain spheres for bowl+handle = handle looks round. Use cube() for flat handle.
- Handle attached at bowl bottom or mid-height = looks wrong. Attach at rim (z=0).
- Bowl too deep (>0.6x radius) = looks like a ladle. Keep depth proportional for measuring scoop.
- No rim reinforcement = thin edge at bowl-handle junction. Add cylinder rim.
- Separate bowl module that doesn't connect to handle = visible gap. Overlap transition piece.

---

### Technique: Open-Shelf Riser (CSG Primitives)

**When to use:** Flat platform risers, monitor stands, desk shelves — any rectangular elevated surface with open front/back.

**Approach:** Top platform + two solid side walls. No back panel, no hollowing. Stadium-shaped cable hole near rear edge.

**Template:**
```openscad
$fn = 60;
width = 300; depth = 200; height = 80;
top_t = 8; side_w = 15; corner_r = 4;
cable_w = 70; cable_r = 10;

module rounded_rect(w, d, h, r) {
    hull() {
        for (x = [-w/2+r, w/2-r])
            for (y = [-d/2+r, d/2-r])
                translate([x,y,0]) cylinder(r=r, h=h);
    }
}

difference() {
    union() {
        translate([0,0,height-top_t])
            rounded_rect(width, depth, top_t, corner_r);
        translate([-width/2+side_w/2, 0, (height-top_t)/2])
            cube([side_w, depth, height-top_t], center=true);
        translate([width/2-side_w/2, 0, (height-top_t)/2])
            cube([side_w, depth, height-top_t], center=true);
    }
    translate([0, depth/2-25, height-top_t-1])
        hull() {
            for (x = [-cable_w/2+cable_r, cable_w/2-cable_r])
                translate([x,0,0]) cylinder(r=cable_r, h=top_t+2);
        }
}
```

**Pitfalls:**
- Don't use hollow-box approach — thick walls obscure open space
- Don't add back panel — risers need visible open front+back
- Side wall thickness ~15mm for stability without looking chunky
- Cable hole should be stadium shape (hull of 2 cylinders), 70-80mm wide
- Position cable hole near rear edge (depth/2 - 25mm from back)

---

### Technique: Small Desktop Container (Bezier Revolution)
Keywords: holder, cup, pencil cup, paper clip holder, desk organizer cup, pen holder, desktop container, catchall

**When to use:** Any small desktop cup/holder for stationery items — paper clips, pens, pencils, thumbtacks, etc.

**What it is:** Standard bezier profile revolution with proportions tuned for desk-scale containers. The critical insight is that desk holders need a specific height:diameter ratio (~1:1) to look purposeful rather than like a generic cup or bowl.

**Key proportions:**
- Total height: 50-60mm
- Rim diameter: 54-60mm
- Base diameter: 40-44mm (foot = ~70% of rim)
- Wall thickness: 2.5mm
- Foot height: 3-5mm

**Decorative band (optional but recommended):**
Embed a sinusoidal ridge in the profile to give it a desk-accessory look:
```openscad
band_t = (z - band_z) / band_width;
ridge = (band_t >= 0 && band_t <= 1) ? band_depth * sin(band_t * 180) : 0;
r = r_base + ridge;
```

**Pitfalls:**
- Height > 65mm → looks like a drinking cup
- Height < 42mm → looks like a bowl
- No taper (straight walls) → looks like a tin can
- Missing decorative detail → looks generic/plain

---

### Technique: Hull-Chain Ergonomic Grip
Keywords: stamp, handle, grip, knob, ergonomic, rubber stamp, tool handle, stamp handle

**When to use:** Any object with a flat base and an ergonomic grip/handle on top — rubber stamps, tool handles, knobs, palm grips.

**What it is:** A flat rectangular base (hull of corner cylinders) with a hull-chain grip built from 5-6 scaled spheres defining cross-section zones: base flare, neck, finger waist, palm swell, and dome cap.

**Why it works:** Hull chain of $fn=120 spheres creates smooth organic transitions. The explicit zone approach (flare → waist → swell → dome) gives the grip a recognizable ergonomic silhouette with clear visual differentiation between finger and palm areas.

**Proven code template:**
```openscad
$fn = 120;
base_w = 60; base_d = 35; base_h = 5;

module base_plate() {
    r = 3;
    hull() {
        for (x = [-base_w/2 + r, base_w/2 - r])
            for (y = [-base_d/2 + r, base_d/2 - r])
                translate([x, y, 0]) cylinder(r = r, h = base_h);
    }
}

module grip() {
    // 1. Base flare
    hull() {
        translate([0, 0, base_h]) scale([base_w/2-5, base_d/2-3, 2]) sphere(r=1);
        translate([0, 0, base_h+5]) scale([17, 13, 3]) sphere(r=1);
    }
    // 2. Neck narrowing
    hull() {
        translate([0, 0, base_h+5]) scale([17, 13, 3]) sphere(r=1);
        translate([0, 0, base_h+12]) scale([13, 10, 3]) sphere(r=1);
    }
    // 3. Finger waist
    hull() {
        translate([0, 0, base_h+12]) scale([13, 10, 3]) sphere(r=1);
        translate([0, 0, base_h+18]) scale([12, 9.5, 2]) sphere(r=1);
    }
    // 4. Palm swell
    hull() {
        translate([0, 0, base_h+18]) scale([12, 9.5, 2]) sphere(r=1);
        translate([0, 0, base_h+26]) scale([16, 13, 5]) sphere(r=1);
    }
    // 5. Dome cap
    hull() {
        translate([0, 0, base_h+26]) scale([16, 13, 5]) sphere(r=1);
        translate([0, 0, base_h+35]) scale([8, 7, 4]) sphere(r=1);
    }
}

difference() {
    union() { base_plate(); grip(); }
    translate([0, 0, -50]) cube([200, 200, 100], center=true);
}
```

**Key parameters:**
| Parameter | Guideline |
|-----------|-----------|
| base_h | 4-6mm — thin enough to look like a stamp base |
| grip height | ~35mm — tall enough to grip comfortably |
| waist rx | 55-65% of base flare rx — visible concavity |
| palm swell rx | 85-100% of base flare rx — fills the hand |
| dome cap rx | 35-45% of palm swell rx — rounded top |
| $fn on spheres | 120 (must be high for smooth curves) |
| segment count | 5-6 (more = slow, fewer = angular) |

**Pitfalls:**
- $fn=16 spheres → visible faceting. Always use $fn=120.
- 30+ segments → compile timeout. Stay at 5-6 segments.
- Grip too wide/low → reads as "mound." Height should be 6-7x base thickness.
- Waist contrast < 30% → indistinguishable from straight taper. Need 40%+ radius reduction.
- Scorer ceiling: organic grips hit ~7/10 — OpenSCAD's CSG hull chain produces recognizable but not highly refined ergonomic shapes.

---

### Technique: Star Polygon Thin-Wall Extrusion
**When to use:** Cookie cutters, stamp shapes, thin-walled 2D profile objects (star, heart, circle, etc.)

**Classification question:** Is it a thin-walled shape defined by a 2D outline? → Star Polygon Thin-Wall Extrusion

**Core approach:**
1. Define a 2D polygon for the desired shape (star uses alternating inner/outer radius points)
2. Create thin walls: `difference()` of polygon and `offset(r = -wall_t)` polygon
3. `linear_extrude()` the thin-wall 2D profile to the cutter height
4. Add a handle rim at the top: thicker band using `offset(r = handle_t)` on the outer edge

**Key parameters:**
- `outer_r`: 35-45mm for standard cookie cutter
- `inner_r`: ~45% of outer_r for 5-pointed star
- `wall_t`: 0.8-1.2mm for cutting edge
- `height`: 20-30mm
- `handle_t`: 1.5-2.5mm extra thickness for grip
- `handle_h`: 4-6mm

**Code template:**
```openscad
$fn = 60;
outer_r = 40; inner_r = 18; points = 5;
height = 25; wall_t = 1.0;
handle_h = 5; handle_t = 2.0;

function star_point(i, r_out, r_in, n) =
    let(angle = i * 180 / n - 90)
    (i % 2 == 0)
        ? [r_out * cos(angle), r_out * sin(angle)]
        : [r_in * cos(angle), r_in * sin(angle)];

module star_polygon(r_out, r_in, n) {
    polygon([for (i = [0 : 2*n - 1]) star_point(i, r_out, r_in, n)]);
}

// Cutter body
linear_extrude(height = height)
difference() {
    star_polygon(outer_r, inner_r, points);
    offset(r = -wall_t) star_polygon(outer_r, inner_r, points);
}

// Handle rim
translate([0, 0, height])
linear_extrude(height = handle_h)
difference() {
    offset(r = handle_t) star_polygon(outer_r, inner_r, points);
    offset(r = -wall_t) star_polygon(outer_r, inner_r, points);
}
```

**Pitfalls:**
- `offset(r = positive)` rounds star tips — only use for handle, not cutting edge
- `inner_r` too close to `outer_r` = barely a star; too small = fragile spikes
- Wall thickness < 0.6mm may not be printable
- Keep `$fn >= 60` for smooth offset curves

---

### Technique: Helical Thread (Threaded Rod/Bolt)
Keywords: thread, threaded, rod, bolt, screw, M8, M6, M10, stud, fastener, threaded rod

**When to use:** Any cylindrical fastener with external helical threads (bolts, threaded rods, studs, screws).

**What it is:** A core cylinder at minor diameter with a helical thread ridge created by `linear_extrude()` with twist, producing a triangular cross-section that winds around the shaft.

**Architecture:**
1. Core cylinder at minor thread diameter
2. Thread ridge via `linear_extrude(twist = -turns * 360, slices = turns * 36)` of a small triangle offset from center
3. Optional chamfered ends via intersection with an envelope shape

**Key decisions:**
- Use `linear_extrude` with twist — NOT hull-chain (10-100x faster compile)
- Triangle cross-section (`$fn=3` circle) centered at midpoint between minor and major radius
- `slices = num_turns * 36` for smooth helix (fewer = visible stepping)
- Standard thread dimensions: M6(pitch=1.0, major=3.0, minor=2.46), M8(1.25, 4.0, 3.32), M10(1.5, 5.0, 4.13)

**Pitfalls:**
- Fine-pitch threads (M6-M10) look like horizontal rings from standard camera angles — this is a fundamental visual limitation at render scale, not a code bug
- Hull-chain approach (72 segments/turn × 40 turns = 2880 hulls) takes 10-15s per compile — avoid for threads
- Making thread deeper than spec doesn't help visual clarity and gets scored as inaccurate
- `$fn=3` on the thread cross-section circle gives a triangle shape — this is intentional for V-thread profile

---

### Technique: Sphere-Top Stopper
Keywords: stopper, plug, cork, bottle stopper, wine stopper, knob, finial, decorative top, round top, cap

**When to use:** Objects with a tapered insertion section (plug/cork) topped by a decorative round/spherical element — wine stoppers, bottle stoppers, decorative corks, knobs with stems.

**What it is:** Combine a `rotate_extrude()` polygon for the tapered plug, a `cylinder()` for the collar/flange, and a `sphere()` for the decorative top. Add decorative rings as torus primitives at latitude lines on the sphere.

**Decomposition:**
1. **Plug** → `rotate_extrude()` with simple trapezoidal polygon (tapered cone)
2. **Collar** → `cylinder()` wider than plug top (visual transition)
3. **Decorative top** → `sphere()` positioned to sit on collar
4. **Decoration** → torus rings at sphere latitudes + optional finial sphere at apex

**Key proportions:**
- Plug: ~7mm bottom radius, ~9.5mm top radius, ~25mm tall (fits standard wine bottle)
- Collar: ~13mm radius, ~3mm tall
- Sphere: ~15mm radius, center at collar_top + sphere_r * 0.7
- Finial: ~3mm radius sphere at sphere apex

**Proven code:**
```openscad
$fn = 120;
union() {
    rotate_extrude()
        polygon(points = [
            [0, 0], [7, 0], [7.3, 0.5], [9.5, 25], [0, 25]
        ]);
    translate([0, 0, 25]) cylinder(h = 3, r = 13);
    translate([0, 0, 38.5]) sphere(r = 15);
    // Decorative rings
    for (frac = [-0.3, 0, 0.3])
        translate([0, 0, 38.5 + 15 * frac])
            rotate_extrude()
                translate([15 * cos(asin(frac)), 0])
                    circle(r = 0.8);
    translate([0, 0, 53.5]) sphere(r = 3);
}
```

**Pitfalls:**
- Don't use bezier for the dome — it tends to come to a point. Use `sphere()` primitive.
- Without decorative rings, the sphere looks generic. Add at least an equatorial ring.
- Torus CSG is slow (~2 min per ring). For faster compile, consider profile-embedded ridges instead.
- Position sphere center so it visually sits on the collar, not floating above it.

---

### Technique: Pedestal Egg Cup (bezier-profile-revolution variant)

**When to use:** Egg cups, egg holders, small pedestal cups — any vessel with a wide base, narrow stem, and small cup on top.

**Key insight:** The cup portion must be SHORT (about 1/3 of total height). Making the cup too tall or wide turns it into a goblet. The stem should be the longest zone.

**Proportions:**
- Total height: ~45mm
- Base: wide (r=24mm), ~13% of height
- Stem: narrow (r=7mm), ~40% of height
- Cup: snug (r=16-17mm), ~33% of height
- Wall thickness: 2.5mm

**Template:**
```openscad
$fn = 120;
total_h = 45;
base_r = 24; base_h = 6;
stem_r = 7;  stem_h = 18;
cup_r = 16;  cup_top_r = 17; cup_h = 15;
wall_t = 2.5;

function bezier3(t, p0, p1, p2, p3) =
    (1-t)*(1-t)*(1-t)*p0 + 3*(1-t)*(1-t)*t*p1 +
    3*(1-t)*t*t*p2 + t*t*t*p3;

function outer_r(z) =
    z <= base_h ?
        bezier3(z/base_h, base_r, base_r, base_r-5, stem_r+5) :
    z <= base_h + stem_h ?
        let(t = (z - base_h) / stem_h)
        bezier3(t, stem_r+5, stem_r, stem_r+1, cup_r-3) :
        let(t = (z - base_h - stem_h) / cup_h)
        bezier3(t, cup_r-3, cup_r+1, cup_r, cup_top_r);

n = 60;
outer_pts = [for (i = [0:n-1]) let(z = i*total_h/(n-1)) [outer_r(z), z]];

cup_start_z = base_h + stem_h + 3;
inner_n = 20;
inner_pts = [for (i = [0:inner_n-1])
    let(t = i/(inner_n-1), z = cup_start_z + t*(total_h-cup_start_z),
        r_in = outer_r(z) - wall_t)
    [max(r_in, 1), z]];

profile_pts = concat(
    [[0,0]], outer_pts,
    [[outer_r(total_h), total_h], [outer_r(total_h)-wall_t, total_h]],
    [for (i = [len(inner_pts)-1:-1:0]) inner_pts[i]],
    [[2, cup_start_z-1], [0, cup_start_z-2], [0, 0]]
);

rotate_extrude($fn=120) polygon(points=profile_pts);
```

**Pitfalls:**
- Cup too tall (>40% of height) → looks like a goblet
- Cup too wide (r>20mm) → loses snug egg-cradling appearance
- Stem too short → looks like a bowl on a disc
- Base not wide enough → looks top-heavy and unstable

---

### Technique: Raised Label Frame on Container

**When to use:** Container/pot/planter with a front-facing label slot, name plate, or card holder.

**Why not just cut a recess?** On curved surfaces, rectangular cuts always look like holes through the wall in renders. Even on flat surfaces, shallow recesses are hard to see in orthographic views. Adding a raised frame is visually clearer and doesn't risk wall penetration.

**Key parameters:**
```
frame_border = 4mm    // width of raised border bars
frame_depth = 4mm     // how far frame protrudes from surface (>= 4mm for visibility)
slot_w, slot_h        // label area dimensions
slot_z_center         // vertical center of label area
```

**Approach:**
1. Use rounded-rectangle cross-section (hull of 4 corner cylinders) for flat front face
2. Taper the body (smaller at bottom) for planter aesthetics
3. Add 4 cube() bars forming a rectangular frame on the front (-Y) face
4. Bottom bar slightly taller to act as card-holding lip
5. Place features on -Y face so they're visible in the front camera view

**Template code:**
```openscad
$fn = 120;

// Tapered rounded-rectangle body
module tapered_rrect(wb, db, rb, wt, dt, rt, h) {
    hull() {
        for (x = [-(wb/2 - rb), wb/2 - rb])
            for (y = [-(db/2 - rb), db/2 - rb])
                translate([x, y, 0]) cylinder(r = rb, h = 0.01);
        for (x = [-(wt/2 - rt), wt/2 - rt])
            for (y = [-(dt/2 - rt), dt/2 - rt])
                translate([x, y, h - 0.01]) cylinder(r = rt, h = 0.01);
    }
}

// Raised frame bars (left, right, bottom with lip, top)
t = slot_z_center / pot_h;
local_d = pot_d_bot + (pot_d_top - pot_d_bot) * t;
translate([-(slot_w/2 + fb), -(local_d/2 + fd), sz - slot_h/2 - fb])
    cube([fb, fd, slot_h + 2*fb]);
// ... (repeat for right, bottom, top bars)
```

**Common failures:**
| What You See | What's Wrong | Fix |
|---|---|---|
| Label slot looks like a hole through the wall | Used difference() to cut recess into cylinder | Use additive raised frame instead of subtractive recess |
| Label slot invisible from front view | Feature on +Y face, camera looks at -Y | Place all front features on -Y face |
| Frame invisible in orthographic front view | Frame depth < 3mm | Use frame_depth >= 4mm |
| Slot has curved/trapezoidal shape | Cut into cylinder surface follows curvature | Use rounded-rectangle body for flat front face |
| Pot looks like a box, not a planter | No taper, no rim | Taper bottom narrower, add rim flare at top |

---

### Technique: Extruded Side-Profile for Angled Nameplates/Stands
**When to use:** Any object that is a flat panel at an angle with a base — nameplates, desk signs, table tents, angled displays, menu holders.

**Core idea:** Define the entire cross-section as a single 2D polygon in the YZ plane, then `linear_extrude()` along the width (X axis). This guarantees all parts (base, lip, plate, back support) are one connected solid.

**Profile polygon order:** base bottom → base top → front lip → plate front face (bottom to top) → plate back face (top to bottom) → back wedge → base bottom.

**Key math:**
```openscad
plate_dx = plate_len * cos(tilt);  // horizontal run of plate
plate_dz = plate_len * sin(tilt);  // vertical rise of plate
tn_y = plate_t * sin(tilt);        // thickness offset Y component
tn_z = plate_t * cos(tilt);        // thickness offset Z component
```

**Text recess rotation:** Use `rotate([+tilt, 0, 0])` (positive tilt) to align the cutting cube with the plate face. Local +Y runs along the plate surface, local -Z goes into the plate.

**Extrusion orientation:** `rotate([90, 0, 90])` before `linear_extrude()` maps polygon X→Y (depth) and polygon Y→Z (height), extrusion→X (width).

**Pitfalls:**
- Separate primitives disconnect from side view — always use single polygon profile
- Wrong rotation sign on text recess puts it outside the body
- Back support must extend 15mm+ past plate back for substantial look
- Don't add floating decorative frames

---

### Technique: Over-Door Hook with 2D Profile Extrusion
Keywords: over-door hook, towel hook, door hook, door clip, over-door hanger, door-mounted hook

**When to use:** Any hook that clips over a door edge — towel hooks, coat hooks, door hangers. The key shape is a U-channel clip at the top (to grip the door) connected to a J-shaped hook below.

**What it is:** A single 2D polygon profile containing both the U-channel clip and the J-hook, extruded to the desired width. The profile is rotated so the 2D X axis maps to vertical (3D Z).

**Critical orientation rule:** Use `rotate([90, 0, 90])` with `linear_extrude()`. This maps:
- 2D X → 3D Z (vertical: clip at positive X = top, hook at negative X = bottom)
- 2D Y → 3D -X (depth: door thickness direction)
- Extrusion → 3D -Y (width of hook)

**The tail/tip direction pitfall:** The upward hook tip MUST extend in the 2D +X direction (positive X in 2D = upward in 3D). If the tail extends in the +Y direction instead, it maps to 3D -X (depth) and becomes invisible from both front and right camera views.

**Two-arc hook pattern:**
1. First arc: 90° quarter circle from arm end going downward
2. Second arc: 100-120° arc curling upward from bottom of first arc

**Proven template:**
```openscad
$fn = 60;
width = 40; thick = 2.5; door_t = 38;
clip_height = 45; back_drop = 20;
hook_attach_y = 14; hook_reach = 30;
j_radius = 14; tip_radius = 10; tip_sweep = 120;

module over_door_hook_2d() {
    gap = door_t; t = thick;
    // U-channel clip
    polygon([[0,0],[0,clip_height],[gap+2*t,clip_height],
             [gap+2*t,clip_height-back_drop],[gap+t,clip_height-back_drop],
             [gap+t,clip_height-t],[t,clip_height-t],[t,0]]);
    // Hook arm
    arm_y = hook_attach_y;
    polygon([[0,arm_y+t/2],[-hook_reach,arm_y+t/2],
             [-hook_reach,arm_y-t/2],[0,arm_y-t/2]]);
    // First arc: 90° quarter circle down
    cx1 = -hook_reach; cy1 = arm_y - j_radius; n = 24;
    outer1 = [for(i=[0:n]) let(a=90+i*90/n)
        [cx1+(j_radius+t/2)*cos(a), cy1+(j_radius+t/2)*sin(a)]];
    inner1 = [for(i=[n:-1:0]) let(a=90+i*90/n)
        [cx1+(j_radius-t/2)*cos(a), cy1+(j_radius-t/2)*sin(a)]];
    polygon(concat([[-hook_reach,arm_y+t/2]], outer1, inner1, [[-hook_reach,arm_y-t/2]]));
    // Second arc: upward-curling tip
    bx = cx1+j_radius*cos(180); by = cy1+j_radius*sin(180);
    cx2 = bx+tip_radius; cy2 = by;
    outer2 = [for(i=[0:n]) let(a=180-i*tip_sweep/n)
        [cx2+(tip_radius+t/2)*cos(a), cy2+(tip_radius+t/2)*sin(a)]];
    inner2 = [for(i=[n:-1:0]) let(a=180-i*tip_sweep/n)
        [cx2+(tip_radius-t/2)*cos(a), cy2+(tip_radius-t/2)*sin(a)]];
    polygon(concat([[bx,by+t/2]], outer2, inner2, [[bx,by-t/2]]));
}
rotate([90, 0, 90]) linear_extrude(height=width) over_door_hook_2d();
```

**Pitfalls:**
| What Goes Wrong | Why | Fix |
|----------------|-----|-----|
| Hook tip invisible from right/front views | Tail extends in 2D +Y direction | Tail must extend in 2D +X direction (maps to 3D +Z = upward) |
| Hook looks like closed loop | j_sweep > 150° | Keep j_sweep ≤ 120° or use two-arc approach |
| Hook too open, won't retain towel | j_sweep < 60° and no upward tip | Use two-arc with 90° down + 100°+ upward curl |
| Overall form looks chunky/blocky | Wall thickness > 3mm | Use thick = 2-2.5mm |
| Hook looks like separate piece from clip | Used hull-chain or separate 3D primitives | Use single 2D polygon extrusion for entire piece |

---

### Technique: Wire Hull-Chain for Pin/Clip Forms
Keywords: cotter pin, split pin, hairpin, wire pin, R-clip, wire form, safety pin, spring clip

**When to use:** Any object made from bent wire — pins, clips, springs, wire forms. The object is essentially a 3D path traced by a circular cross-section.

**Why this works:** Hull-chaining small spheres along a path creates smooth wire geometry. Low $fn (12) on the spheres keeps compile times fast since wire objects have many segments. Breaking the path into named modules (loop, legs, transitions) keeps code readable.

**Core pattern:**
```openscad
$fn = 12;  // Critical: low $fn for wire objects

wire_d = 0.8;  // ~2-3% of total length
wire_r = wire_d / 2;
total_length = 30;
loop_r = 2.5;
leg_length = total_length - loop_r * 2;
leg_spacing = wire_d + 0.5;
splay_amount = 0.8;
splay_zone = leg_length * 0.15;

module wire_seg(p1, p2) {
    hull() {
        translate(p1) sphere(r = wire_r);
        translate(p2) sphere(r = wire_r);
    }
}

// 1. Semicircular loop at top
steps = 20;
for (i = [0 : steps - 1]) {
    a1 = i * 180 / steps;
    a2 = (i + 1) * 180 / steps;
    wire_seg(
        [loop_r * cos(a1), 0, leg_length + loop_r + loop_r * sin(a1)],
        [loop_r * cos(a2), 0, leg_length + loop_r + loop_r * sin(a2)]
    );
}

// 2. Transition from loop to legs
wire_seg([-loop_r, 0, leg_length + loop_r], [-leg_spacing/2, 0, leg_length]);
wire_seg([loop_r, 0, leg_length + loop_r], [leg_spacing/2, 0, leg_length]);

// 3. Straight legs
wire_seg([-leg_spacing/2, 0, splay_zone], [-leg_spacing/2, 0, leg_length]);
wire_seg([leg_spacing/2, 0, splay_zone], [leg_spacing/2, 0, leg_length]);

// 4. Splayed tips
wire_seg([-leg_spacing/2 - splay_amount, 0, 0], [-leg_spacing/2, 0, splay_zone]);
wire_seg([leg_spacing/2 + splay_amount, 0, 0], [leg_spacing/2, 0, splay_zone]);
```

**Design rules:**
- Wire diameter = 2-3% of total length for thin wire appearance
- $fn = 12 on hull spheres (prevents 10-minute compiles)
- Loop arc: 20 steps over 180° for smooth curve
- Leg spacing = wire_d + small gap (0.5mm) for close parallel legs
- Splay at tips: <1mm outward over bottom 15% of leg length
- Always add transition segments between loop and legs when loop_r > leg_spacing

**Pitfalls:**
- $fn=120 → compile takes 10+ minutes; use $fn=12
- Wire diameter > 3% of length → looks chunky, not wire-like
- No leg splay → scorer marks incomplete (real cotter pins have bent tips)
- Splay > 1mm → looks like tuning fork
- Loop < 180° → looks like open hook, not a proper eye
- Missing transitions → geometry gap between loop and legs

---

### Technique: Electronics Enclosure with Port Cutouts
Keywords: case, enclosure, raspberry pi, arduino, electronics, port, cutout, PCB, housing, project box, controller case

**When to use:** Any rectangular case designed to house a PCB (Raspberry Pi, Arduino, ESP32, etc.) with openings for connectors on the sides.

**What it is:** Extension of the Box/Enclosure Assembly technique with precisely-sized port cutouts. Uses hull() corner cylinders for rounded rectangle + difference() for both hollowing and port cuts. Critical insight: case height must be >= 1.5x the tallest port cutout height, otherwise cutouts look like open panels rather than ports.

**Design rules:**
| Parameter | Guideline |
|-----------|-----------|
| `box_h` | >= 1.5x tallest port height (typically 20mm for Pi-sized boards) |
| `port_z` | `bottom + standoff_h + 1` — above PCB level |
| `cut_depth` | `wall + 2` with start offset `-0.5` from wall face |
| Port sizes | Use real connector dimensions: Ethernet 16x11, USB-A 14x8, micro-HDMI 7x3, USB-C 9x3.5 |
| Circular ports | Use `cylinder` with `rotate([-90,0,0])` or `rotate([0,90,0])` depending on wall |
| GPIO slot | 52x6mm slot on top near one edge |

**Pitfalls:**
- Case too short → ports look like open panels (the main failure mode)
- Cut doesn't fully penetrate wall → invisible port (use wall+2 depth, offset by -0.5)
- All ports on one side → unrealistic layout (distribute per actual PCB)
- Standoffs must clear bottom → `translate([x,y,bottom])` not `z=0`
- Display box+lid side by side, not stacked

---

### Technique: Battery Compartment with Coil Springs
Keywords: battery, compartment, holder, spring, contact, coil, sliding lid, AA, cell, battery box

**When to use:** Any battery compartment or holder that needs spring contacts and a removable/sliding lid.

**What it is:** CSG box construction with hull-corner rounded rectangle, battery wells carved by difference(), coil springs built from hull-chained low-$fn spheres in a helix, flat contacts as cube+sphere bumps, and a sliding lid with tongue-and-groove rail system.

**Key dimensions (AA battery):**
| Parameter | Value |
|-----------|-------|
| Battery well width | bat_d + 1mm clearance |
| Battery well length | bat_l + 12mm (room for springs) |
| Wall height | 60-65% of battery diameter |
| Wall thickness | 2.5mm |
| Spring outer_r | 3-4mm |
| Spring wire_d | 1.0-1.2mm |
| Spring coils | 3-4 |
| Rail groove height | 3-4mm |
| Rail groove width | 1.5-2mm |

**Architecture:**
1. rrect() hull-corner box as outer shell
2. difference() to carve battery wells and lid rail grooves
3. Coil springs as hull-chained spheres ($fn=12) at positive terminal end
4. Flat contacts (cube + sphere nub) at negative terminal end
5. Lid as flat plate with rail tongues + pull tab with finger grip hole
6. Display box and lid side-by-side

**Pitfalls:**
- Simple zigzag shapes don't read as springs — must use actual helical coil geometry
- Use $fn=12 for hull spheres on coils to keep compile time reasonable (~60s not 10min)
- Spring must protrude visibly into well (not flush with wall)
- Wall height 55-65% of battery diameter — 100% makes it look like a solid block
- Lid rail grooves need rail_h >= 3mm to be visible
- Display box and lid side-by-side so scorer can see inside the compartment

---

### Technique: Flat Strap with Sawtooth Ratchet
Keywords: cable tie, zip tie, ratchet, strap, sawtooth, teeth, fastener, band, tie wrap

**When to use:** Any elongated flat object with repeating sawtooth/ratchet teeth along one surface — cable ties, zip ties, ratchet straps, toothed bands.

**What it is:** Build a flat rectangular strap using `cube()`, add sawtooth ratchet teeth along one face using hull-pairs of thin cubes (gradual ramp up, vertical drop), and a locking head with a through-slot cut using `difference()`.

**Why hull-pairs beat polyhedron:** Polyhedron with degenerate faces (coplanar vertices) causes non-manifold mesh errors. Hull of two thin cubes at different heights creates clean sawtooth geometry every time.

**Proven code template:**
```openscad
$fn = 60;
strap_width = 4.5;
strap_thickness = 1.5;
strap_length = 140;
head_length = 16;
head_width = 10;
head_height = 8;
slot_width = strap_width + 0.5;
slot_height = strap_thickness + 0.5;
z_base = (head_height - strap_thickness) / 2;
tooth_count = 35;
tooth_height = 0.7;

module head() {
    difference() {
        hull() {
            for (x = [1.5, head_length-1.5])
                for (y = [-head_width/2+1.5, head_width/2-1.5])
                    translate([x, y, 0]) cylinder(r=1.5, h=head_height);
        }
        translate([-3, -slot_width/2, z_base])
            cube([head_length + 6, slot_width, slot_height]);
    }
}

module strap() {
    translate([head_length, -strap_width/2, z_base])
        cube([strap_length - 5, strap_width, strap_thickness]);
    // Rounded tip
    translate([head_length + strap_length - 5, 0, z_base])
        linear_extrude(height = strap_thickness)
            intersection() {
                circle(r = strap_width/2);
                translate([0, -strap_width/2]) square([strap_width, strap_width]);
            }
}

module ratchet_teeth() {
    tooth_pitch = (strap_length - 20) / tooth_count;
    start_x = head_length + 3;
    z_top = z_base + strap_thickness;
    for (i = [0 : tooth_count - 1]) {
        x = start_x + i * tooth_pitch;
        hull() {
            translate([x, -strap_width/2, z_top])
                cube([0.2, strap_width, 0.01]);
            translate([x + tooth_pitch * 0.85, -strap_width/2, z_top])
                cube([0.2, strap_width, tooth_height]);
        }
    }
}

module threaded_front() {
    translate([-12, -strap_width/2, z_base])
        cube([12.5, strap_width, strap_thickness]);
}

union() { head(); strap(); ratchet_teeth(); threaded_front(); }
```

**Pitfalls:**
- Polyhedron teeth with coplanar/degenerate vertices → non-manifold errors. Use hull() pairs instead.
- Sharp pointed tip looks wrong — use semicircle or blunt end for ribbon feel.
- Head slot visibility is the hardest part — use head_height >= 2x slot_height, chamfer entries.
- Keep threaded-front stub short (< 15mm) so scorer doesn't see it as a separate piece.
- Don't try to curve the strap — straight reads better at render scale.

---

### Technique: Side-by-Side Interlocking Joint (Dovetail)
**When to use:** Object is a joint, splice, or interlocking connection with male/female or pin/socket pieces displayed apart.

**Approach:**
1. Define the interlocking profile as a 2D polygon (trapezoid for dovetail, rectangle for box joint, etc.)
2. Male piece = base block + `linear_extrude()` of profile polygons as protruding features
3. Female piece = base block + `difference()` with same profiles (+ clearance) as slots
4. Display side by side with gap >= 25mm, female rotated 180° so openings face male features
5. Both pieces should have the same overall bounding dimensions

**Key parameters:**
- `tail_narrow/tail_wide` ratio ~1:1.8 for dovetail angle (too extreme = triangular)
- `tail_length` should be 25-40% of block depth
- `clearance` = 0.5mm for visible slot walls
- Use `linear_extrude(height=block_h)` so profile runs full height

**Code template:**
```openscad
module dovetail_2d(narrow_w, wide_w, length) {
    polygon(points = [
        [-narrow_w/2, 0], [narrow_w/2, 0],
        [wide_w/2, length], [-wide_w/2, length]
    ]);
}
module male_piece() {
    union() {
        translate([-block_w/2, 0, 0]) cube([block_w, block_d, block_h]);
        for (i = [0:num_tails-1]) {
            x_pos = (i - (num_tails-1)/2) * tail_spacing;
            translate([x_pos, 0, 0]) rotate([0,0,180])
                linear_extrude(height=block_h)
                    dovetail_2d(tail_narrow, tail_wide, tail_length);
        }
    }
}
module female_piece() {
    difference() {
        translate([-block_w/2, -tail_length, 0])
            cube([block_w, block_d + tail_length, block_h]);
        for (i = [0:num_tails-1]) {
            x_pos = (i - (num_tails-1)/2) * tail_spacing;
            translate([x_pos, -tail_length-1, -1])
                linear_extrude(height=block_h+2)
                    dovetail_2d(tail_narrow+cl, tail_wide+cl, tail_length+2);
        }
    }
}
translate([-(block_w/2+gap/2), 0, 0]) male_piece();
translate([(block_w/2+gap/2), 0, 0]) rotate([0,0,180]) female_piece();
```

**Pitfalls:**
- Extruding along wrong axis makes features invisible from standard views
- Too-extreme narrow/wide ratio creates triangular instead of trapezoidal look
- Female and male pieces must have matching total dimensions
- Blind slots (don't exit back face) avoid internal rendering artifacts
- Adequate gap between pieces needed for right-side view separation

---

### Technique: Post-and-Finial Hybrid CSG
Keywords: fence, post, finial, pointed, decorative, cap, column top, pillar, newel

**When to use:** Objects with a prismatic (square/rectangular) body topped by a rotationally symmetric decorative element — fence posts, newel posts, column caps, pillar finials.

**What it is:** Combine `cube()` for the prismatic body with `rotate_extrude()` polygon for the decorative top. A wider cap plate bridges the transition between the square post and round finial.

**Decomposition pattern:**
1. **Post** → `cube()` centered on origin
2. **Cap plate** → wider `cube()` on top of post (visual transition square → round)
3. **Collar** → `cylinder()` at base of finial
4. **Finial body** → `rotate_extrude()` with urn-shaped polygon profile tapering to a point
5. **Decorative ring** → torus at collar junction via `rotate_extrude() translate() circle()`

**Key proportions:**
- Post: square cross-section, height = main dimension
- Cap: 10-20% wider than post, 3-5mm thick
- Finial: 35-40% of post height for visual balance
- Collar: slightly wider than cap diagonal/2 for smooth transition

**Proven code:**
```openscad
$fn = 120;
post_w = 20; post_h = 100;
cap_w = 24; cap_h = 5;
collar_r = 12; collar_h = 6;
finial_base_r = 10;

// Post
translate([-post_w/2, -post_w/2, 0]) cube([post_w, post_w, post_h]);
// Cap
translate([-cap_w/2, -cap_w/2, post_h]) cube([cap_w, cap_w, cap_h]);
// Collar
translate([0, 0, post_h + cap_h]) cylinder(h=collar_h, r=collar_r);
// Finial - urn profile tapering to point
translate([0, 0, post_h + cap_h + collar_h])
    rotate_extrude()
        polygon(points=[
            [0,0],[10,0],[11,1],[12,3],[11.5,6],[9,10],
            [8,14],[9,17],[10,19],[8,22],[5,26],[3,29],[1,32],[0,34]
        ]);
// Decorative ring
translate([0, 0, post_h + cap_h])
    rotate_extrude() translate([11, 0]) circle(r=1.2);
```

**Pitfalls:**
- Pure cone finial looks too simple — use urn profile with multiple bulges
- Cap must be wider than post for visual transition
- Don't forget collar cylinder to bridge square cap to round finial
- Finial too short looks like a bump; too tall looks like an antenna

**Discovered:** Fence post session, 1 iteration. Hybrid CSG approach worked immediately — square post + rotate_extrude finial with urn profile.

---

### Technique: Gothic Arch Extrusion
**Use for:** Gothic/pointed arch windows, church windows, lancet arches, ogival openings, decorative arch frames

**Decision criteria:** Object has a pointed (gothic/ogival) arch shape, typically a window or door frame

**Approach:**
1. Build 2D profile of gothic arch using two circular arcs meeting at a point
2. Each arc center is at the base of the opposite side of the arch
3. Radius controls pointedness: `r = frame_w` (equilateral gothic), `r = frame_w * 1.2` (lancet/more pointed)
4. Create frame by subtracting inner arch (same centers, radius - frame_t) from outer
5. Add mullion bars as simple rectangles via union()
6. Extrude along Y, orient upright with `rotate([90,0,0])`

**Key parameters:**
- `arch_r = frame_w * 1.0` to `1.2` — controls pointedness (higher = more pointed lancet)
- `arch_start_h` — height of straight sides before arch begins (~40-50% of total)
- `frame_t` — frame thickness (3-4mm for 50-60mm wide frames)
- `depth` — extrusion depth (18-20mm for visible 3D presence)

**Code template:**
```openscad
$fn = 120;
frame_w = 50; frame_t = 3.5; depth = 20;
arch_start_h = 45; arch_r = frame_w * 1.2;
peak_h = arch_start_h + sqrt(arch_r*arch_r - (frame_w/2)*(frame_w/2));

function arc(cx, cy, r, sa, ea, n=60) =
    [for(i=[0:n]) let(t=i/n, a=sa+t*(ea-sa)) [cx+r*cos(a), cy+r*sin(a)]];

// Outer profile with sill
module outer_profile() {
    hw = frame_w/2; sill_ext = 4; sill_h = 5;
    left = arc(hw, arch_start_h, arch_r, atan2(0,-frame_w), atan2(peak_h-arch_start_h,-hw));
    right = arc(-hw, arch_start_h, arch_r, atan2(peak_h-arch_start_h,hw), atan2(0,frame_w));
    polygon(concat([[-hw-sill_ext,0],[-hw-sill_ext,sill_h],[-hw,sill_h],[-hw,arch_start_h]],
                   left, right,
                   [[hw,arch_start_h],[hw,sill_h],[hw+sill_ext,sill_h],[hw+sill_ext,0]]));
}

// Inner profile (same centers, reduced radius)
module inner_profile() {
    hw = frame_w/2 - frame_t; r = arch_r - frame_t; sill_h = 5;
    pk = arch_start_h + sqrt(r*r - (frame_w/2)*(frame_w/2));
    left = arc(frame_w/2, arch_start_h, r, atan2(0,-frame_w), atan2(pk-arch_start_h,-frame_w/2));
    right = arc(-frame_w/2, arch_start_h, r, atan2(pk-arch_start_h,frame_w/2), atan2(0,frame_w));
    polygon(concat([[-hw,sill_h],[-hw,arch_start_h]], left, right, [[hw,arch_start_h],[hw,sill_h]]));
}

rotate([90, 0, 0])
linear_extrude(height=depth, center=true) {
    difference() { outer_profile(); inner_profile(); }
    // Center mullion
    translate([-1.25, 5]) square([2.5, peak_h - 8]);
}
```

**Pitfalls:**
- Single arc = rounded (Romanesque), not gothic — MUST use two crossing arcs
- Inner arch with different centers creates apex gap — use SAME centers, just reduce radius
- intersection() to clip mullion fills wrong regions — use simple rectangle union instead
- Frame too thick (>5mm) looks chunky — use 3-3.5mm
- Depth too shallow (<15mm) looks flat from side — use 18-20mm
- Separate 3D sill cube causes non-manifold — integrate sill into 2D profile
- Sub-arches (tracery) easily disconnect if arc centers miscalculated

---

### Technique: Enclosed Bore Housing with Window Cutout
Keywords: housing, vial, window, cutout, level, bubble, bore, enclosed, mounting, instrument, viewer, inspection

**When to use:** Any housing that encloses a cylindrical component (vial, tube, sensor) with a viewing window — bubble level housings, instrument cases, sensor enclosures, inspection windows.

**Core approach:**
1. Build solid rounded-rectangle body using `hull()` corner cylinders (`rrect` helper)
2. Subtract a cylindrical bore along the long axis for the enclosed component — make bore shorter than housing to keep ends sealed
3. Cut a deep window from the top that intersects the bore, revealing the internal channel
4. Add mounting ear flanges at ends with bolt holes

**Proven code template:**
```openscad
$fn = 120;
housing_l = 80;  housing_w = 28;  housing_h = 22;
wall = 3;  corner_r = 3;
vial_d = 16;  vial_l = 66;
window_l = 44;  window_w = 16;  window_r = 4;
ear_l = 16;  ear_w = housing_w;  ear_h = 6;
ear_hole_d = 4.5;  ear_spacing = housing_l/2 + ear_l/2 - 2;

module rrect(w, d, h, r) {
    hull() {
        for (x = [-(w/2 - r), w/2 - r])
            for (y = [-(d/2 - r), d/2 - r])
                translate([x, y, 0]) cylinder(r=r, h=h);
    }
}

difference() {
    union() {
        rrect(housing_l, housing_w, housing_h, corner_r);
        for (x = [-ear_spacing, ear_spacing])
            translate([x, 0, 0]) rrect(ear_l, ear_w, ear_h, corner_r);
    }
    translate([0, 0, housing_h/2])
        rotate([0, 90, 0]) cylinder(d=vial_d, h=vial_l, center=true);
    translate([0, 0, housing_h/2 - vial_d/4])
        rrect(window_l, window_w, housing_h, window_r);
    for (x = [-ear_spacing, ear_spacing])
        translate([x, 0, -1]) cylinder(d=ear_hole_d, h=ear_h + 2);
}
```

**Design rules:**
| Parameter | Guideline |
|-----------|-----------|
| `vial_l` | 80-85% of housing_l (sealed ends) |
| `window_l` | 50-60% of housing_l |
| `window_w` | ~= vial_d (to show bore) |
| `window_depth` | Must reach below bore centerline (housing_h/2 - vial_d/4) |
| `ear_h` | 25-30% of housing_h (thin flanges) |

**Pitfalls:**
- Don't extend bore past housing ends — scorer penalizes side openings
- Window must be deep enough to intersect bore — otherwise just a surface recess
- Mounting ears should be thin flanges, not full-height blocks
- Use `rrect()` for both body and window for refined rounded corners

---

### Technique: Counterbore Mount Base
Keywords: magnetic mount, counterbore, disc magnet, mount base, magnet holder, flush mount, recessed magnet, mounting plate, magnet recess

**When to use:** Any flat mounting base that holds a disc magnet (or similar cylindrical insert) in a recessed pocket, with screw holes for attachment.

**What it is:** A cylindrical or rectangular base plate with a stepped bore — a wide shallow counterbore from one face for the insert, an optional narrower through-hole for push-out, and mounting holes on a pitch circle around the perimeter.

**Key dimensions:**
- `base_h >= 2 * magnet_h` (structural floor under counterbore)
- `cb_d = magnet_d + 0.4-0.6mm` clearance
- `through_d < cb_d` (push-out hole, typically 50% of cb_d)
- Mount holes on PCD = 75% of base_d

**Code pattern:**
```openscad
$fn = 120;
difference() {
    cylinder(d = base_d, h = base_h);
    // Counterbore (from top)
    translate([0, 0, base_h - magnet_h])
        cylinder(d = cb_d, h = magnet_h + 1);
    // Push-out through-hole
    translate([0, 0, -1])
        cylinder(d = through_d, h = base_h - magnet_h + 2);
    // N mounting holes with countersinks on pitch circle
    for (i = [0 : n - 1]) {
        a = i * 360 / n;
        translate([pcd/2 * cos(a), pcd/2 * sin(a), 0]) {
            translate([0, 0, -1]) cylinder(d = hole_d, h = base_h + 2);
            translate([0, 0, base_h - cs_depth])
                cylinder(d1 = hole_d, d2 = cs_d, h = cs_depth + 0.01);
        }
    }
}
```

**Pitfalls:**
- Counterbore floor too thin → magnet pushes through. Keep floor >= magnet_h.
- Forgot clearance on counterbore → magnet won't fit. Always add 0.2-0.4mm.
- Through-hole same diameter as counterbore → no floor at all. Keep through_d < cb_d.
- Mounting holes too close to counterbore → weak material. Keep PCD > cb_d + 2*hole_d.
- No countersinks → screw heads protrude above surface.
- Boss ring around counterbore is optional but adds visual definition of the pocket.

---

### Technique: Classical Column Assembly
Keywords: column, classical, doric, ionic, capital, shaft, base, plinth, fluted, pillar, pedestal, architectural, corinthian

**When to use:** Any classical architectural column or pillar with distinct base, shaft, and capital sections.

**What it is:** Hybrid approach combining `rotate_extrude()` for rotationally symmetric parts with CSG cubes for square elements (plinth, abacus). Fluting via radial cylinder cuts.

**Why it beats alternatives:**
- Pure rotate_extrude can't make square plinth/abacus
- Pure CSG primitives can't make smooth echinus curves or entasis
- Hybrid gives the best of both: smooth curves where needed, crisp edges for architectural elements

**Key proportions (Doric order):**
- Base: ~12% of total height (square plinth + round molding)
- Shaft: ~70% of total height (with subtle entasis)
- Capital: ~18% of total height (necking + echinus + abacus)
- Shaft bottom radius : top radius ≈ 10:9
- Abacus width ≈ 3.5x shaft radius
- Plinth width ≈ 2.8x shaft radius

**Entasis formula:**
```openscad
entasis = 0.8 * sin(t * 180) * (1 - t * 0.3);
r = r_bottom + (r_top - r_bottom) * t + entasis;
```
Creates a gentle outward bulge at ~1/3 height, tapering toward the top.

**Fluting pattern:**
```openscad
flute_count = 16;  // Doric: 16-20
flute_r = 2;       // Keep < shaft_r * 0.25
for (i = [0 : flute_count - 1])
    rotate([0, 0, i * 360 / flute_count])
        translate([shaft_r - 0.5, 0, base_h + 2])
            cylinder(h=shaft_h - 4, r=flute_r, $fn=12);
```

**Pitfalls:**
- `cube(center=true)` at non-zero Z creates confusing positioning — always use `translate([-w/2,-w/2,z])` + `cube([w,w,h])`
- Entasis > 1mm makes the shaft look barrel-shaped
- Flute cylinders that are too large will eat through the shaft
- Echinus that flares too steeply looks like a bucket, not a classical curve
- Start fluting 2mm above base and end 4mm below capital for clean transitions

**Discovered:** Classical column session, 2 iterations. Abacus positioning bug fixed in iter 1.

---

### Technique: Radial Tick Mark Graduation
**Use when:** Object has angular markings, degree scales, dials, gauges, protractors, compass roses
**Classification:** Flat profile + radial detail cutting/addition

**Approach:**
1. Create the base shape as a flat disc or half-disc using `intersection()` of `cylinder()` with `cube()`
2. Cut out inner area with smaller cylinder if needed
3. Add tick marks as raised `cube()` primitives, rotated with `rotate([0,0,angle])` at each interval
4. Vary tick length by hierarchy: longest at 90° intervals, medium at 30°, shortest at 10°
5. Make ticks **raised above surface** by 1-2mm so they're visible in renders
6. Add degree labels with `text()` at major intervals (use sparingly — slow to compile)

**Key parameters:**
- `tick_height`: 1-2mm above body surface (MUST be raised, not flush)
- `tick_width`: ≥ 1.0mm for visibility (1.5mm for major ticks)
- `tick_length`: 15mm major / 10mm medium / 6mm minor (scale to body radius)

**Code template:**
```openscad
$fn = 120;
body_r = 60;
inner_r = 12;
thickness = 3;
tick_height = 1.5;

// Half-circle body
difference() {
    intersection() {
        cylinder(r = body_r, h = thickness);
        translate([-body_r-1, 0, 0]) cube([body_r*2+2, body_r+1, thickness]);
    }
    translate([0,0,-1]) cylinder(r = inner_r, h = thickness+2);
}

// Radial ticks
for (angle = [0:10:180]) {
    tick_len = (angle%90==0) ? 15 : (angle%30==0) ? 10 : 6;
    tick_w = (angle%90==0) ? 1.5 : 1.0;
    rotate([0,0,angle])
        translate([body_r - tick_len, -tick_w/2, 0])
            cube([tick_len, tick_w, thickness + tick_height]);
}
```

**Pitfalls:**
- Flush tick marks (same height as body) are invisible — always raise above surface
- Tick width < 0.8mm disappears in OpenSCAD renders
- `text()` is extremely slow to compile — limit to major intervals only
- Don't forget the straight base edge along the diameter

---

### Technique: Solid-Body Arch Bridge (CSG Subtraction)

**When to use:** Bridge, arch bridge, aqueduct, viaduct — any structure with repeating semicircular arches supporting a deck.

**Classification:** CSG Primitives (mechanical/boxy with curved cutouts)

**Core idea:** Build the entire bridge as a single solid rectangular block, then subtract arch openings. Each arch opening = a cylinder (semicircle) above the spring line + a cube (rectangular pier gap) below it. Parapets are separate cubes on top.

**Key parameters:**
- `n_arches`: number of arches (3 is classic)
- `arch_r`: arch radius (controls span)
- `pier_w`: pier width along bridge length
- `pier_h`: pier height (spring line)
- `arch_wall`: thickness of material around arch
- `pier_d`: bridge width/depth

**Template:**
```openscad
$fn = 120;
n_arches = 3;
arch_r = 20; pier_w = 16; pier_d = 50;
pier_h = 30; arch_wall = 5; deck_h = 8;
parapet_h = 6; parapet_t = 3;
arch_span = arch_r * 2;
total_length = (n_arches + 1) * pier_w + n_arches * arch_span;
total_h = pier_h + arch_r + deck_h;

difference() {
    cube([total_length, pier_d, total_h]);
    for (i = [0 : n_arches - 1]) {
        cx = pier_w + i * (arch_span + pier_w) + arch_span / 2;
        translate([cx - arch_r + arch_wall, -1, -1])
            cube([arch_span - 2 * arch_wall, pier_d + 2, pier_h + 1]);
        translate([cx, -1, pier_h])
        rotate([-90, 0, 0])
            cylinder(h = pier_d + 2, r = arch_r - arch_wall);
    }
}
// Parapets
for (side = [0, 1]) {
    translate([-4, side * (pier_d - parapet_t), total_h])
        cube([total_length + 8, parapet_t, parapet_h]);
}
```

**Pitfalls:**
- Don't use full cylinder holes — they look like tunnels, not arches. Combine cylinder + cube for proper arch-over-pier opening.
- Don't add cutwaters (triangular pier extensions) — they create diamond artifacts in top view.
- Don't add small protruding keystones — they read as artifacts at render scale.
- Avoid coincident faces between separate union pieces — overlap by 0.5-1mm.
- Keep the design clean and simple — the basic solid-minus-arches approach scores best.

---

### Technique: CSG Safe Box with Front-Mounted Dial

**When to use:** Safe, vault, strongbox, lockbox, combination lock box

**Approach:** CSG Primitives — rectangular box + cylindrical dial assembly

**Key dimensions:**
- Box: 60×50×50mm (W×D×H), wall 3mm
- Dial: r=14mm, protrude 6-7mm from face
- Center knob: r=4-5mm, h=3-4mm
- Lever: r=2.5mm, length 16mm, ball end r=3.5mm
- Handle: 28mm wide T-bar, posts 8mm tall

**Construction:**
1. Box body: `cube() - cube()` for hollow
2. Door lines: 4 thin cubes recessed 1.5mm into front face (Y=0), inset 4mm from edges
3. Dial assembly: bezel ring (r+3) → dial cylinder → groove ring (concentric difference) → center knob
4. Mount dial: `translate([cx, 0, cz]) rotate([90,0,0])` — this maps +Z to -Y (protrudes toward camera)
5. Lever: vertical cylinder with sphere ball-end, offset right of dial
6. Handle: two cylinder posts + horizontal cylinder bar on top
7. Hinges: two barrel cylinders on side face

**Critical rotation rule:** `rotate([90,0,0])` maps +Z → -Y (OUT from front face). `rotate([-90,0,0])` maps +Z → +Y (INTO box). Always use positive 90 for front-protruding features.

**Pitfalls:**
- Dial invisible from front ortho view (same color, flat angle) — this is an OpenSCAD limitation; the dial shows well in iso view
- Don't use mirror() on dial — causes non-manifold
- Don't use hull() for tick marks — use simple cubes
- Keep dial simple: bezel + face + groove ring + knob = 4 concentric cylinders

---

### Technique: Annular Sector Spiral Assembly
**Use when:** Object has steps/treads arranged in a spiral or helical pattern around a central axis (spiral staircase, helical ramp)

**Core idea:** Each step is an annular sector (ring segment) — a curved tread wider at the outside, narrower at the center. Steps are rotated and translated upward uniformly.

**Key parameters:**
- `col_r`: Central column radius (6-8mm typical)
- `outer_r`: Outer radius of treads (38-42mm typical)
- `step_sweep`: Angular span of each tread (55-65° for 5 steps)
- `step_thickness`: Tread thickness (6mm minimum)
- `step_rise`: Vertical distance between steps
- `total_height`: Overall staircase height (120mm+ for clear spiral)

**Code template:**
```openscad
$fn = 80;
total_height = 120;
col_r = 8;
step_count = 5;
step_rise = total_height / step_count;
step_thickness = 6;
outer_r = 40;
inner_r = col_r + 1;
step_sweep = 65;

cylinder(r = col_r, h = total_height + 10);

for (i = [0 : step_count - 1]) {
    rotate([0, 0, i * 360/step_count])
    translate([0, 0, i * step_rise])
    linear_extrude(height = step_thickness)
    annular_sector(inner_r, outer_r, step_sweep);
}

module annular_sector(r_inner, r_outer, sweep_angle) {
    n = 30;
    points = concat(
        [for (j = [0 : n]) let(a = j * sweep_angle / n)
            [r_outer * cos(a), r_outer * sin(a)]],
        [for (j = [n : -1 : 0]) let(a = j * sweep_angle / n)
            [r_inner * cos(a), r_inner * sin(a)]]
    );
    polygon(points);
}
```

**Pitfalls:**
- Don't use rectangular cube() treads — they look like paddles
- Don't add risers or handrail posts — they clutter the render
- Don't make treads thinner than 6mm — they look like blades
- Keep step_sweep < 360/step_count to leave visible gaps between steps
- Make total height tall enough that the spiral progression is clearly visible

---

### Technique: Articulated Toggle Mechanism
**Use when:** Object is a toggle clamp, press clamp, or lever-linkage mechanism with pivoting arm.

**Decision:** CSG Primitives with hull() for angled links

**Key principles:**
1. Build 5 modules: base plate, uprights, pivot assembly, arm, toggle links, clamping bar
2. Use forked arm (two parallel bars) at clamping end to straddle the spindle
3. Single arm bar at handle end for clean silhouette
4. Visible cylindrical pivot pins spanning between uprights (r=3-4mm)
5. Add enlarged pivot bosses (pin_r + 2mm) at each upright for visual clarity
6. Toggle links connect arm fork to vertical spindle on clamping bar via hull()
7. Clamping bar has: horizontal plate + vertical spindle + conical pressing pad
8. Handle: cylinder + sphere end caps for realistic grip
9. Base plate with rounded corners (hull of 4 cylinders) and 4 mounting holes

**Proportions:**
- Base: 90×32×5mm
- Uprights: 28mm tall, at ~40% of base length
- Arm extends ~40mm behind pivot (handle) and ~25mm forward (clamping end)
- Clamping bar: 45×20mm plate
- Handle: r=7mm cylinder, 20mm long

**Code template:**
```openscad
$fn = 60;
base_l = 90; base_w = 32; base_h = 5;
upright_h = 28; upright_x = 35;

// Base with rounded corners
module base_plate() {
    difference() {
        hull() {
            for (x=[3,base_l-3]) for (y=[3,base_w-3])
                translate([x,y,0]) cylinder(r=3, h=base_h);
        }
        // 4 mounting holes
        for (x=[11,base_l-11]) for (y=[11,base_w-11])
            translate([x,y,-1]) cylinder(d=5, h=base_h+2);
    }
}

// Forked arm with hull() for angled segments
// Toggle links via hull() between arm fork and spindle top
// Clamping bar: plate + cylinder spindle + conical pad
```

**Pitfalls to avoid:**
- Don't use a single flat arm — fork it at the clamping end
- Don't make the clamping bar just a flat plate — add spindle and pad
- Don't forget pivot bosses — small pins are invisible
- Don't put the pressing pad below the base plane
- Handle needs sphere end caps to look like a real grip

---

### Technique: Hinged Lid Box Assembly
Keywords: watch box, jewelry box, hinged lid, hinged box, flip-top box, case, presentation box, storage box with lid, trinket box

**When to use:** Any rectangular box with a lid that opens on a hinge — watch boxes, jewelry cases, presentation boxes, trinket boxes. NOT for screw-on lids or snap-fit (use Box/Enclosure Assembly instead).

**What it is:** CSG construction with `hull()` corner cylinders for rounded rectangle body, `difference()` for hollowing, a separate lid module with inner nesting lip, and a cylindrical hinge barrel at the back edge. The lid is shown open via rotation around the hinge point.

**Proven code template:**
```openscad
$fn = 80;
box_w = 110; box_d = 75; box_h = 38;
wall = 3; bottom = 3; corner_r = 4;
lid_h = 10; lip_depth = 4; hinge_r = 3.5;

module rrect(w, d, h, r) {
    hull() {
        for (x = [-(w/2 - r), w/2 - r])
            for (y = [-(d/2 - r), d/2 - r])
                translate([x, y, 0]) cylinder(r=r, h=h);
    }
}

module box_body() {
    difference() {
        rrect(box_w, box_d, box_h, corner_r);
        translate([0, 0, bottom])
            rrect(box_w - 2*wall, box_d - 2*wall, box_h + 1, corner_r);
    }
}

module lid() {
    rrect(box_w, box_d, lid_h, corner_r);
    translate([0, 0, lid_h])
        difference() {
            rrect(box_w - 2*wall + 0.4, box_d - 2*wall + 0.4, lip_depth, corner_r);
            translate([0, 0, -1])
                rrect(box_w - 2*wall - 2, box_d - 2*wall - 2, lip_depth + 2, corner_r);
        }
}

module hinge() {
    translate([0, box_d/2, box_h])
        rotate([0, 90, 0])
            cylinder(r=hinge_r, h=box_w - 16, center=true);
}

box_body();
hinge();
// Lid open toward camera
translate([0, box_d/2, box_h]) {
    rotate([-110, 0, 0]) {
        translate([0, -box_d/2, 0]) { lid(); }
    }
}
```

**Design rules:**
| Parameter | Guideline |
|-----------|-----------|
| `lid_h` | 8-12mm (proportional to box_h ~25-30%) |
| `lip_depth` | 3-5mm for secure nesting |
| `hinge_r` | 3-4mm, single full-width barrel |
| `corner_r` | 3-5mm for elegant rounded corners |
| Open angle | -100 to -115 degrees (negative = toward camera) |

**Optional additions:**
- **Watch cushion**: hull() of spheres scaled vertically for pillow shape, on a raised platform
- **Clasp**: small cylinder or cube on front edge of box + lid
- **Velvet lining**: inner rrect at bottom+0.5 with slightly smaller dimensions (visual only)

**Pitfalls:**
- Hinge at negative Y (front) blocks the view — always hinge at positive Y (back)
- Multiple interleaving knuckles cause non-manifold warnings and look fragile
- Lid lip must go on top of the lid plate (translate to lid_h), not underneath
- Box too square looks like a generic container — make w > d for watch box feel
- Lid too thick (>12mm) looks heavy — keep proportional to box height

---

### Technique: Two-Part Snap Buckle
Keywords: buckle, snap buckle, clip, backpack, strap buckle, side release buckle, fastener, clasp, side-release

**When to use:** Any side-release buckle, strap buckle, snap-fit two-part clip, or similar fastener with male prong + female receiver.

**What it is:** Two separate bodies with a visual gap: (1) Female = rounded rectangular frame with large center opening + cross-bar + strap bar cylinder, (2) Male = tapered body narrowing to two parallel prong arms with outward-facing triangular barbs + strap bar cylinder.

**Decomposition pattern:**
1. **Female frame** — `rbox()` outer shell minus `rbox()` center opening
2. **Cross-bar** — integral part of frame (the band between opening and strap slot)
3. **Strap bar (female)** — cylinder embedded 2mm into back wall
4. **Male body** — hull taper from wide back to narrow front
5. **Prong arms** — two parallel cubes, optionally tapered
6. **Barbs** — triangular hull at prong tips, facing outward
7. **Strap bar (male)** — cylinder embedded 2mm into back

**Key dimensions:**
| Parameter | Guideline |
|-----------|-----------|
| `strap_w` | 20-25mm (matches webbing width) |
| `body_h` | 7-8mm (not thinner or it looks flat) |
| `wall` | 2.5mm |
| `fem_l` | 38-40mm |
| `prong_l` | 15-17mm |
| `prong_gap` | 4-5mm |
| `barb` | 1.5-2mm overhang |
| `gap` | 3mm visual separation between halves |

**Critical rules:**
- The open center frame is the most recognizable feature — never omit it
- Embed strap bar cylinders 2mm+ into body to avoid non-manifold
- Use `rbox()` (hull of 4 corner cylinders) for smooth rounded edges
- Release button cutouts are optional and can hurt recognition — skip if not scoring well
- Keep body_h >= 7mm for visible 3D depth from iso/front views

**Pitfalls:**
- Solid slab without center opening → looks like a rectangle, not a buckle
- Bar cylinder touching face exactly → non-manifold; overlap by 2mm
- Reducing body_h below 7mm → loses 3D look, scores worse
- Curved prongs via hull-chain → no improvement over straight cubes
- Adding release windows through walls → weakens frame silhouette

**Discovered:** Snap buckle training, 8 iterations. Best score 7/10. Key breakthrough: open-frame female design (iter 3→5 point jump). The two-part silhouette with visible center opening is the critical recognition feature. Plateau at 7 — scorer consistently wanted "thinner/more flexible looking" prongs which is difficult in OpenSCAD's blocky geometry.

---

### Technique: Solid-Block Slot Rack
Keywords: SD card holder, card rack, card organizer, memory card holder, card slot, card stand, SIM card holder, USB holder, thin item rack

**When to use:** Any holder/rack for multiple thin flat items stored in parallel slots — SD cards, SIM cards, USB drives, business cards stored vertically.

**What it is:** A single rounded-rectangle solid body with N narrow vertical slots cut from the top using `difference()`. Cards slide in from the top and protrude for easy removal.

**Key insight:** Use a solid block with subtractive slots rather than an open-frame with additive dividers. The solid block reads as a "holder" from all angles, while the open-frame reads as a "bookshelf" or "file organizer."

**Proven code template:**
```openscad
$fn = 60;
card_t = 3;        // slot width (card thickness + 0.5-1mm clearance)
card_w = 25;       // slot length (card width + clearance)
card_insert = 18;  // insertion depth — keep < card height so cards protrude
num_cards = 6;
wall = 3.5;        // wall between slots
outer_wall = 3.5;
base_h = 4;

body_w = 2*outer_wall + num_cards*card_t + (num_cards-1)*wall;
body_d = 2*outer_wall + card_w;
body_h = base_h + card_insert;

module rbox(w, d, h, r) {
    hull() {
        for (x=[r,w-r], y=[r,d-r])
            translate([x,y,0]) cylinder(r=r, h=h);
    }
}

difference() {
    rbox(body_w, body_d, body_h, 3);
    for (i = [0:num_cards-1]) {
        slot_x = outer_wall + i * (card_t + wall);
        translate([slot_x, outer_wall, base_h])
            cube([card_t, card_w, card_insert + 1]);
    }
}
```

**Design rules:**
| Parameter | Guideline |
|-----------|-----------|
| `card_t` | Real card thickness + 0.5-1mm clearance |
| `card_insert` | 50-65% of card height (cards must protrude) |
| `wall` | 3-4mm between slots |
| `outer_wall` | 3-4mm |
| `base_h` | 3-5mm |
| `body_h` | Should be < card height so cards visibly stick out |

**Pitfalls:**
- Open-frame divider approach looks like a bookshelf — use solid block + slot cuts
- Slots too wide look like a file organizer — match slot width to card thickness
- Body too tall hides cards — insertion depth must be less than card height
- Tall side/back walls hide slots from orthographic views — keep compact
- Don't add finger-grip notches at front — they read as artifacts, not features

---

### Technique: CSG Open-End Wrench Profile
**When to use:** Any wrench, spanner, or open-end tool that grips hex bolts/nuts.

**Approach:** Flat 2D profile extruded to tool thickness (4-6mm). Three zones: handle (hull of two circles), taper (hull connecting handle to wider head), and head (oval hull with jaw cutout).

**Key dimensions for 10mm wrench:**
- Total length: ~155mm
- Handle width: 14-15mm
- Head overall width: ~27mm (jaw + 2× jaw wall)
- Jaw opening: 13mm (bolt size + 2-3mm clearance)
- Jaw wall: 6-7mm each arm
- Head length: ~34mm
- 15-degree head angle offset
- Thickness: 5mm

**Critical code pattern:**
```openscad
$fn = 100;
// Head: oval body with jaw slot
module wrench_head() {
    difference() {
        hull() {
            circle(d = head_oa_w);
            translate([head_length - 10, 0]) circle(d = head_oa_w);
            translate([head_length, 0]) circle(d = head_oa_w - 2);
        }
        // Jaw: rectangle extending past head tip
        translate([head_length * 0.25, -jaw_opening/2])
            square([head_length, jaw_opening]);
    }
}
// Handle + taper + rotated head
linear_extrude(height = thickness, center = true) {
    hull() {
        translate([r, 0]) circle(r = r);
        translate([handle_length, 0]) circle(d = handle_w);
    }
    hull() {
        translate([handle_length, 0]) circle(d = handle_w);
        translate([handle_length + taper_length, 0]) circle(d = head_oa_w * 0.7);
    }
    translate([handle_length + taper_length, 0])
        rotate([0, 0, 15]) wrench_head();
}
```

**Pitfalls:**
- Don't use hull of circles for jaw cutout — creates closed oval shape
- Don't use polygon with center convergence point — creates V-shape instead of U
- Jaw opening must extend PAST the head boundary to read as truly open
- Head too round = looks bulbous; use multiple circles in hull for elongated oval
- Handle too thin = looks like a rod/wire, not a tool (minimum 14mm)
- Jaw opening too small = looks like a slot, not a wrench jaw (use bolt size + 3mm)

## 5. OpenSCAD Language Rules

These are non-negotiable — violating them causes compile errors or hallucinated output.

- Variables are **constants** — you CANNOT reassign them
- `fillet()`, `chamfer()`, `round_edges()`, `thread()` **DO NOT EXIST**
- `for()` loops create **implicit unions** — they are NOT imperative
- `if/else` controls geometry inclusion, NOT variable assignment — use `let()` instead
- First child in `difference()` is the base; remaining are subtracted
- `$fn = 120` for smooth curves (not 30)
- All dimensions in millimeters

---

## 6. What This Agent Cannot Do Well

Be honest about limitations. These should trigger a warning, not a bad attempt:

- **Organic creatures** (animals, faces, hands) — OpenSCAD lacks freeform surfaces
- **Smooth freeform curves** that aren't rotationally symmetric — no NURBS
- **Mechanical threads** — technically possible but extremely complex
- **Articulated assemblies** — OpenSCAD produces single-body outputs
- **Arbitrary surface textures** — OpenSCAD is geometry only (but diamond knurl IS possible via additive helical ridges)

---

## 7. How This Document Evolves

After iterating on a new object type:
1. Did you discover a **new general technique**? Add it to Section 4.
2. Did you discover a **new failure mode**? Add it to the relevant technique's pitfalls.
3. Did you discover a **new shape category** for an existing technique? Add it to the "When to use" list.
4. Did you discover a **new visual failure**? Add it to Section 2's failure table.
5. Did you learn something about **evaluation**? Update Section 2.

**Never add object-specific recipes.** Always generalize: "this technique works for THIS CLASS of objects because..."

---

## 8. Training Loop — How to Iterate on a New Object

This is the step-by-step process for learning a new technique via the Playwright + OpenSCAD CLI loop.

### Setup (once per object)

1. **Create the .scad file:** `<object>_iter.scad` in the app root
2. **Create a views directory:** `mkdir <object>_views`
3. **Create the viewer HTML:**

```html
<!DOCTYPE html>
<html>
<head>
<title>OBJECT Iteration Viewer</title>
<style>
  body { margin: 0; background: #1a1a2e; color: #eee; font-family: system-ui; }
  h1 { text-align: center; margin: 20px 0 10px; font-size: 24px; color: #e0e0e0; }
  h2 { text-align: center; margin: 0 0 20px; font-size: 16px; color: #888; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; max-width: 1200px; margin: 0 auto; padding: 0 20px 20px; }
  .view { position: relative; }
  .view img { width: 100%; border-radius: 8px; background: #f5f5f5; }
  .view .label { position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.7); color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 13px; font-weight: 600; }
</style>
</head>
<body>
  <h1>OBJECT — Iteration <span id="iter">0</span></h1>
  <h2>Score and give feedback in the terminal</h2>
  <div class="grid">
    <div class="view"><span class="label">Isometric</span><img id="img-iso" src="iso.png"></div>
    <div class="view"><span class="label">Front</span><img id="img-front" src="front.png"></div>
    <div class="view"><span class="label">Right</span><img id="img-right" src="right.png"></div>
    <div class="view"><span class="label">Top</span><img id="img-top" src="top.png"></div>
  </div>
  <script>
    setInterval(() => {
      const t = Date.now();
      document.getElementById('img-iso').src = 'iso.png?' + t;
      document.getElementById('img-front').src = 'front.png?' + t;
      document.getElementById('img-right').src = 'right.png?' + t;
      document.getElementById('img-top').src = 'top.png?' + t;
    }, 2000);
    window.updateIteration = function(n) {
      document.getElementById('iter').textContent = n;
    };
  </script>
</body>
</html>
```

4. **Start HTTP server:** `python3 -m http.server PORT` in the views directory (background)
5. **Open in Playwright:** `browser_navigate` to `http://localhost:PORT/viewer.html`

### Render loop (each iteration)

```bash
OPENSCAD=/opt/homebrew/bin/openscad
$OPENSCAD -o <views>/iso.png   --camera=0,0,0,55,0,25,0 --autocenter --viewall --imgsize=800,600 --colorscheme=Tomorrow <object>_iter.scad
$OPENSCAD -o <views>/front.png --camera=0,0,0,90,0,0,0   --autocenter --viewall --imgsize=800,600 --colorscheme=Tomorrow --projection=ortho <object>_iter.scad
$OPENSCAD -o <views>/right.png --camera=0,0,0,90,0,90,0  --autocenter --viewall --imgsize=800,600 --colorscheme=Tomorrow --projection=ortho <object>_iter.scad
$OPENSCAD -o <views>/top.png   --camera=0,0,0,0,0,0,0    --autocenter --viewall --imgsize=800,600 --colorscheme=Tomorrow --projection=ortho <object>_iter.scad
```

Then update the iteration counter via Playwright: `window.updateIteration(N)`

The viewer auto-refreshes images every 2 seconds — no manual reload needed.

### Iteration strategy

- **10 iterations total** (0-9)
- Run all iterations autonomously — don't ask for feedback each time
- Self-evaluate each render visually (read the PNG) before moving to the next
- Track what worked and what didn't across iterations
- If an iteration makes things worse, REVERT to the best version
- Final iteration should be a clean, well-commented template

### After iteration — capture the technique

1. Add a new `### Technique:` section to this document (Section 4) with:
   - `Keywords:` line for `skills.ts` matching
   - When to use, what it is, why it works
   - Proven code template
   - Parameter tuning table
   - Pitfalls discovered during iteration
   - `Discovered:` line noting the session and key breakthroughs
2. `skills.ts` auto-matches keywords — no code changes needed
3. Update Section 1's classification table if a new category was discovered
4. Update Section 2's failure table if new visual failures were found
