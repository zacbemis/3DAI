$fn = 120;
bowl_w = 45;
bowl_l = 55;
bowl_depth = 12;
bowl_wall = 2.5;
handle_l = 60; // Total length will be approx 112mm, well within 120mm limit

// Pre-calculate key Y positions along the spoon's spine for clarity and consistency
y_front_tip = -bowl_l * 0.35;
y_bowl_center = 0;
y_bowl_back = bowl_l * 0.35;
y_handle_start = bowl_l * 0.6;
y_handle_mid = y_handle_start + handle_l * 0.4;
y_handle_end = y_handle_start + handle_l;

module spoon_solid() {
    // Section A: front of bowl (widest, lowest point of the scoop)
    hull() {
        translate([0, y_front_tip, 6])
            scale([bowl_w * 0.4, 12, bowl_depth * 0.7]) sphere(r=1);
        translate([0, y_bowl_center, 6])
            scale([bowl_w / 2, 14, bowl_depth]) sphere(r=1);
    }
    // Section B: bowl center to back (tapering towards handle)
    hull() {
        translate([0, y_bowl_center, 6])
            scale([bowl_w / 2, 14, bowl_depth]) sphere(r=1);
        translate([0, y_bowl_back, 5.5])
            scale([bowl_w * 0.35, 12, 9]) sphere(r=1);
    }
    // Section C: bowl back to handle start (transition point)
    hull() {
        translate([0, y_bowl_back, 5.5])
            scale([bowl_w * 0.35, 12, 9]) sphere(r=1);
        translate([0, y_handle_start, 5])
            scale([8, 9, 6]) sphere(r=1); // Start of handle, rounded profile
    }
    // Section D: handle mid-section (continuous taper)
    hull() {
        translate([0, y_handle_start, 5])
            scale([8, 9, 6]) sphere(r=1);
        translate([0, y_handle_mid, 4.5])
            scale([6, 8, 5]) sphere(r=1); // Mid handle, maintaining rounded profile
    }
    // Section E: handle end (final taper)
    hull() {
        translate([0, y_handle_mid, 4.5])
            scale([6, 8, 5]) sphere(r=1);
        translate([0, y_handle_end, 4])
            scale([5, 7, 4]) sphere(r=1); // End of handle, rounded and tapered
    }
}

module spoon() {
    difference() {
        spoon_solid();
        // Carve the scoop from above.
        // The Y scale is kept short to avoid cutting into the handle transition.
        translate([0, -3, bowl_depth + bowl_wall - 1])
            scale([(bowl_w - 2 * bowl_wall) / 2, bowl_l * 0.28, bowl_depth - bowl_wall - 1])
                sphere(r=1);
        // Flatten the bottom of the spoon to make it sit flat
        translate([0, 0, -50]) cube([300, 300, 100], center=true);
    }
}

spoon();