$fn = 120;

// Gear Dimensions
teeth = 24;             // Number of teeth
module_val = 3;         // Module value (determines tooth size)
gear_thickness = 12;    // Thickness of the gear body

// Calculated Gear Radii
pitch_r = teeth * module_val / 2;       // Pitch radius
outer_r = pitch_r + module_val;         // Outer radius (addendum)
root_r = pitch_r - 1.25 * module_val;   // Root radius (dedendum)
tooth_angle = 360 / teeth;              // Angle per tooth

// Hub Dimensions
bore_d = 10;            // Diameter of the central bore for a shaft
hub_d = 20;             // Diameter of the hub
hub_extra_h = 10;       // Height the hub extends above the gear thickness

// Keyway Dimensions (for a standard key)
key_width = 4;          // Width of the keyway slot
key_depth = 2;          // Depth of the keyway cut into the bore wall

// Module to create the 2D profile of a single tooth
module single_tooth_profile_2d() {
    // These ratios define the shape of the involute-like tooth profile
    // Tuned for a balance of strength and smooth appearance
    tip_half = tooth_angle * 0.16;
    root_half = tooth_angle * 0.30;

    // Intermediate radii for a smoother, more involute-like curve
    r1 = root_r + (pitch_r - root_r) * 0.5;
    r2 = pitch_r;
    r3 = pitch_r + (outer_r - pitch_r) * 0.5;

    // Intermediate angles for tooth flanks
    a1 = root_half * 0.85;
    a2 = root_half * 0.65;
    a3 = tip_half + (root_half - tip_half) * 0.3;

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

// Module to create a single 3D tooth
module single_tooth_3d() {
    linear_extrude(height = gear_thickness) single_tooth_profile_2d();
}

// Module to create the base disc of the gear (up to root radius)
module gear_base_disc_3d() {
    linear_extrude(height = gear_thickness) circle(r = root_r);
}

module gear_assembly() {
    total_h = gear_thickness + hub_extra_h;

    difference() {
        union() {
            // Main gear body: base disc + all teeth
            union() {
                gear_base_disc_3d();
                for (i = [0 : teeth - 1])
                    rotate([0, 0, i * tooth_angle])
                        single_tooth_3d();
            }

            // Hub for shaft mounting
            union() {
                cylinder(h = total_h, d = hub_d);
                // Hub shoulder ring for a smooth transition
                translate([0, 0, gear_thickness])
                    cylinder(h = 1.5, r1 = hub_d / 2 + 1.5, r2 = hub_d / 2);
            }
        }

        // Central bore for the shaft
        translate([0, 0, -1]) // Extend slightly below for clean cut
            cylinder(h = total_h + 2, d = bore_d); // Extend slightly above for clean cut

        // Keyway slot
        translate([bore_d / 2 - key_depth, -key_width / 2, -1]) // Position at bore edge
            cube([key_depth + 1, key_width, total_h + 2]); // Ensure it cuts through entirely
    }
}

gear_assembly();