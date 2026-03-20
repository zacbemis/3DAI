$fn = 64;

// Main dimensions
wall_thickness = 3;
base_width = 60;
base_depth = 40;
wall_height = 40;
roof_height = 25;
roof_overhang = 5;

// All Z coordinates will be relative to the base of the house being at Z=0.
// X and Y coordinates relative to the 0,0 corner of the house base.

module house_shell() {
    // Outer walls, bottom at Z=0, corner at (0,0,0)
    cube([base_width, base_depth, wall_height]);
}

module roof_structure() {
    color("red")
    translate([base_width / 2, base_depth / 2, wall_height]) { // Position roof on top of walls, centered
        linear_extrude(height = base_depth + 2 * roof_overhang, center = true)
        polygon(points = [
            [-base_width / 2 - roof_overhang, 0],
            [base_width / 2 + roof_overhang, 0],
            [0, roof_height]
        ]);
    }
}

module door_details(door_width, door_height) {
    frame_thickness = 2;
    doorknob_radius = 1.5;
    doorknob_offset_from_edge = frame_thickness + 3; // From the side edge of the door panel
    doorknob_height_from_bottom = door_height / 2; // Halfway up the door panel

    color("brown") { // Door frame
        difference() {
            cube([wall_thickness + 0.1, door_width, door_height]); // Protrudes slightly
            translate([0, frame_thickness, frame_thickness])
            cube([wall_thickness + 0.1, door_width - 2 * frame_thickness, door_height - 2 * frame_thickness]);
        }
        // Door panel (slightly recessed from frame)
        translate([wall_thickness / 4, frame_thickness, frame_thickness])
        cube([wall_thickness / 2, door_width - 2 * frame_thickness, door_height - 2 * frame_thickness]);
    }
    color("gold") { // Doorknob
        translate([wall_thickness / 2 + 0.1, door_width - doorknob_offset_from_edge, doorknob_height_from_bottom])
        sphere(r = doorknob_radius);
    }
}

module window_details(window_width, window_height, panes_x, panes_y) {
    frame_thickness = 1.5;
    pane_thickness = 0.5;

    color("brown") { // Frame
        difference() {
            cube([wall_thickness + 0.1, window_width, window_height]);
            translate([0, frame_thickness, frame_thickness])
            cube([wall_thickness + 0.1, window_width - 2 * frame_thickness, window_height - 2 * frame_thickness]);
        }
    }

    color("lightblue", alpha = 0.7) { // Glass area (simplified)
        translate([wall_thickness / 4, frame_thickness + pane_thickness / 2, frame_thickness + pane_thickness / 2])
        cube([wall_thickness / 2, window_width - 2 * frame_thickness - pane_thickness, window_height - 2 * frame_thickness - pane_thickness]);
    }

    color("brown") { // Pane separators
        // Horizontal bars
        for (j = [1 : panes_y - 1]) {
            translate([wall_thickness / 4, frame_thickness, frame_thickness + j * (window_height - 2 * frame_thickness) / panes_y - pane_thickness / 2])
            cube([wall_thickness / 2 + 0.1, window_width - 2 * frame_thickness, pane_thickness]);
        }

        // Vertical bars
        for (i = [1 : panes_x - 1]) {
            translate([wall_thickness / 4, frame_thickness + i * (window_width - 2 * frame_thickness) / panes_x - pane_thickness / 2, frame_thickness])
            cube([wall_thickness / 2 + 0.1, pane_thickness, window_height - 2 * frame_thickness]);
        }
    }
}

module chimney_structure() {
    chimney_width = 10;
    chimney_depth = 8;
    chimney_height = 20;

    color("gray")
    // Position on roof. Centered on X, towards the back on Y, aligned with roof peak height.
    translate([base_width / 2 - chimney_width / 2, base_depth - chimney_depth - roof_overhang / 2, wall_height + roof_height - chimney_height]) {
        // Main chimney body
        cube([chimney_width, chimney_depth, chimney_height]);
        // Small cap (slightly wider)
        translate([-1, -1, chimney_height])
        cube([chimney_width + 2, chimney_depth + 2, 3]);
    }
}

// Assemble the house
union() {
    // Main structural elements (walls with cutouts)
    color("lightgreen")
    difference() {
        house_shell();
        // Cut out inner void for walls (leaves a solid floor)
        translate([wall_thickness, wall_thickness, 0])
        cube([base_width - 2 * wall_thickness, base_depth - 2 * wall_thickness, wall_height - wall_thickness]);

        // Cutout depth for all openings (slightly more than wall_thickness)
        cut_depth = wall_thickness + 1;

        // Door cutout (front wall)
        door_width = 15;
        door_height = 25;
        translate([base_width - cut_depth / 2, base_depth / 2 - door_width / 2, 0])
        rotate([0, 90, 0]) {
            cube([cut_depth, door_width, door_height]);
        }

        // Front window cutout
        window_width = 20;
        window_height = 20;
        translate([base_width - cut_depth / 2, base_depth / 2 - window_width / 2 + 5, wall_height - window_height - 10]) // 10mm from top
        rotate([0, 90, 0]) {
            cube([cut_depth, window_width, window_height]);
        }
        // Back window cutout
        translate([cut_depth / 2, base_depth / 2 - window_width / 2 - 5, wall_height - window_height - 10]) // 10mm from top
        rotate([0, 90, 0]) {
            cube([cut_depth, window_width, window_height]);
        }
        // Side windows cutouts (Y walls)
        translate([base_width / 2 - window_width / 2 - 5, base_depth - cut_depth / 2, wall_height - window_height - 10])
        cube([window_width, cut_depth, window_height]);

        translate([base_width / 2 - window_width / 2 + 5, cut_depth / 2, wall_height - window_height - 10])
        cube([window_width, cut_depth, window_height]);
    }

    roof_structure();

    chimney_structure();

    // Details for doors and windows
    // Door details
    translate([base_width - wall_thickness, base_depth / 2 - door_width / 2, 0])
    rotate([0, 90, 0]) {
        door_details(door_width, door_height);
    }
    // Front window details
    translate([base_width - wall_thickness, base_depth / 2 - window_width / 2 + 5, wall_height - window_height - 10])
    rotate([0, 90, 0]) {
        window_details(window_width, window_height, 2, 2);
    }
    // Back window details
    translate([0, base_depth / 2 - window_width / 2 - 5, wall_height - window_height - 10])
    rotate([0, 90, 0]) {
        window_details(window_width, window_height, 2, 2);
    }
    // Side window details (Y walls)
    translate([base_width / 2 - window_width / 2 - 5, base_depth - wall_thickness, wall_height - window_height - 10])
    window_details(window_width, window_height, 2, 2);

    translate([base_width / 2 - window_width / 2 + 5, 0, wall_height - window_height - 10])
    window_details(window_width, window_height, 2, 2);

    // Porch/steps
    color("gray")
    translate([base_width, base_depth / 2 - 20 / 2, 0]) {
        cube([10, 20, 5]); // A small step
    }
}