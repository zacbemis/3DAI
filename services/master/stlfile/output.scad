$fn = 120;

// Laptop overall dimensions
laptop_width = 100;
laptop_depth = 70;
laptop_thickness_base = 6;
laptop_thickness_screen = 4;
laptop_corner_radius = 4;

// Screen dimensions
screen_bezel_thickness = 3;
screen_x = laptop_width - (screen_bezel_thickness * 2);
screen_y = laptop_depth - (screen_bezel_thickness * 2);
screen_z = 0.5; // Thickness of the actual display part

// Keyboard dimensions
keyboard_width = laptop_width - 8;
keyboard_depth = laptop_depth / 2 - 4;
keyboard_recess_depth = 0.5;
key_size = 4;
key_spacing = 1;
key_height = 0.2;

// Trackpad dimensions
trackpad_width = 30;
trackpad_depth = 20;
trackpad_recess_depth = 0.5;
trackpad_offset_x = 0; // Centered
trackpad_offset_y = - (laptop_depth / 2 - 4 - trackpad_depth / 2) - 5; // Positioned below keyboard area

// Hinge dimensions
hinge_radius = 2.5;
hinge_length = laptop_width - 20;
hinge_clearance = 0.5; // Clearance for the hinge pin

module rounded_box(box_x, box_y, box_z, box_r) {
    linear_extrude(height = box_z) {
        minkowski() {
            square([box_x - 2*box_r, box_y - 2*box_r], center = true);
            circle(r = box_r, $fn = $fn);
        }
    }
}

module laptop_base() {
    difference() {
        // Main base body
        rounded_box(laptop_width, laptop_depth, laptop_thickness_base, laptop_corner_radius);

        // Keyboard recess
        translate([0, (laptop_depth / 2) - (keyboard_depth / 2) - 4, laptop_thickness_base - keyboard_recess_depth - 0.01]) {
            rounded_box(keyboard_width, keyboard_depth, keyboard_recess_depth + 0.02, laptop_corner_radius / 2);
        }

        // Trackpad recess
        translate([trackpad_offset_x, trackpad_offset_y, laptop_thickness_base - trackpad_recess_depth - 0.01]) {
            rounded_box(trackpad_width, trackpad_depth, trackpad_recess_depth + 0.02, laptop_corner_radius / 2);
        }

        // Hinge cut for base (creates the top half of the hinge channel in the base)
        translate([0, laptop_depth/2, laptop_thickness_base]) { // Move to the hinge pivot point
             rotate([90,0,0]) { // Align cylinder along Y-axis (laptop width)
                difference() {
                    // Full cylinder representing the hinge channel volume
                    cylinder(r=hinge_radius + hinge_clearance, h=hinge_length + 0.02, center = true);
                    // Cut everything below the local Z=0 plane (keeps the Z>0 part)
                    translate([0,0,-((hinge_radius + hinge_clearance) + 0.02)/2]) {
                        cube([(hinge_radius + hinge_clearance)*2 + 0.04, hinge_length + 0.04, (hinge_radius + hinge_clearance) + 0.02], center = true);
                    }
                }
            }
        }
    }

    // Keyboard keys (simplified)
    translate([0, (laptop_depth / 2) - (keyboard_depth / 2) - 4, laptop_thickness_base - keyboard_recess_depth]) {
        for (i = [0 : floor(keyboard_width / (key_size + key_spacing)) -1]) {
            for (j = [0 : floor(keyboard_depth / (key_size + key_spacing)) -1]) {
                translate([
                    -keyboard_width/2 + (key_size/2) + i * (key_size + key_spacing),
                    -keyboard_depth/2 + (key_size/2) + j * (key_size + key_spacing),
                    key_height/2
                ]) {
                    cube([key_size, key_size, key_height], center = true);
                }
            }
        }
    }
}

module laptop_screen() {
    difference() {
        // Main screen body
        rounded_box(laptop_width, laptop_depth, laptop_thickness_screen, laptop_corner_radius);

        // Screen display recess
        translate([0, 0, laptop_thickness_screen - screen_z - 0.01]) {
            rounded_box(screen_x, screen_y, screen_z + 0.02, laptop_corner_radius / 2);
        }

        // Hinge cut for screen (creates the bottom half of the hinge channel in the screen)
        translate([0, laptop_depth/2, 0]) { // Move to the hinge pivot point relative to screen's bottom
             rotate([90,0,0]) { // Align cylinder along Y-axis (laptop width)
                difference() {
                    // Full cylinder representing the hinge channel volume
                    cylinder(r=hinge_radius + hinge_clearance, h=hinge_length + 0.02, center = true);
                    // Cut everything above the local Z=0 plane (keeps the Z<0 part)
                    translate([0,0,((hinge_radius + hinge_clearance) + 0.02)/2]) {
                        cube([(hinge_radius + hinge_clearance)*2 + 0.04, hinge_length + 0.04, (hinge_radius + hinge_clearance) + 0.02], center = true);
                    }
                }
            }
        }
    }
}

module laptop_hinge_pin() {
    translate([0, laptop_depth/2, laptop_thickness_base]) { // Position at the hinge pivot point
        rotate([90, 0, 0]) { // Align cylinder along Y-axis (laptop width)
            cylinder(r = hinge_radius, h = hinge_length, center = true);
        }
    }
}

module laptop_assembly() {
    // Base part
    translate([0, 0, 0]) {
        laptop_base();
    }

    // Screen part
    open_angle = 120; // Angle from closed (0 degrees) to upright (90 degrees) to flat open (180 degrees)

    // First, lift the screen so its bottom surface (Z=0 in its module) is at the base's top surface.
    translate([0, 0, laptop_thickness_base]) {
        // Then, rotate the screen around its back edge (which is at y = laptop_depth/2 in its local coordinates).
        // This is done by moving the local hinge point to the origin, rotating, then moving back.
        translate([0, laptop_depth/2, 0]) { // Move local hinge point (screen's back edge) to current origin
            rotate([open_angle, 0, 0]) { // Rotate around X-axis
                translate([0, -laptop_depth/2, 0]) { // Move local hinge point back to its position in screen's local space
                    laptop_screen();
                }
            }
        }
    }

    // Hinge pin (can be hidden if not needed for visual)
    laptop_hinge_pin();
}

// Render the full laptop assembly
laptop_assembly();