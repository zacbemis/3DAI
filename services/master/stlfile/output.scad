$fn = 64;

// Dimensions
ball_radius = 37.5; // Roughly 75mm diameter for a standard basketball size
groove_width = 1.5; // Width of the grooves
groove_depth = 0.5; // Depth the grooves cut into the sphere

// Calculated radius for the cutter elements to ensure proper depth
cutter_outer_radius = ball_radius + groove_depth;
// The minor radius for the torus cutters (which is essentially the cross-section of the groove itself)
cutter_minor_radius = groove_width / 2 + groove_depth;

difference() {
    // The main orange sphere of the basketball
    sphere(r = ball_radius);

    // Union of all groove cutters
    // These cutters will remove material from the main sphere to create the grooves
    union() {
        // --- Straight Grooves ---

        // Equatorial groove: A flat cylinder (disk) cutting horizontally through the sphere's center.
        // Its radius is slightly larger than the ball_radius to cut into the surface,
        // and its height defines the groove_width.
        cylinder(h = groove_width, r = cutter_outer_radius, center = true);

        // Meridian groove: Another flat cylinder, rotated to cut vertically from pole to pole.
        // The default cylinder is along the Z-axis. Rotating [90, 0, 0] aligns it with the Y-axis,
        // making it cut along the YZ plane.
        rotate([90, 0, 0])
        cylinder(h = groove_width, r = cutter_outer_radius, center = true);

        // --- Curved S-shaped Grooves ---

        // First pair of S-grooves: These lines run from pole to pole, curving outwards.
        // This is achieved by using a torus as a cutter.
        // The torus's major radius (R) is the ball's radius, ensuring it reaches the poles.
        // The torus's minor radius (r) is the cross-section of the groove.
        // By default, a torus's major circle is in the XY plane.
        // rotate([0, 90, 0]) rotates the torus so its major circle lies in the YZ plane,
        // creating the desired S-curves that pass through the X-axis points on the equator.
        // A lower $fn for cutters is used to optimize rendering as they are only for removal.
        rotate([0, 90, 0])
        torus(R = ball_radius, r = cutter_minor_radius, $fn = 32);

        // Second pair of S-grooves: These are identical to the first pair but rotated 90 degrees
        // around the Z-axis to form the cross-pattern.
        // rotate([90, 0, 0]) rotates the torus so its major circle lies in the XZ plane,
        // creating S-curves that pass through the Y-axis points on the equator.
        rotate([90, 0, 0])
        torus(R = ball_radius, r = cutter_minor_radius, $fn = 32);
    }
}