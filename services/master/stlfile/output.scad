$fn = 120; // Set $fn for smooth curves

// Coaster dimensions
coaster_d = 100;        // Overall diameter of the coaster
coaster_h = 4;          // Thickness of the base/lattice
rim_h = 3.5;            // Height of the rim above the lattice
border_w = 5;           // Width of the outer rim

// Hex grid parameters
grid_r = 6;             // Spacing parameter for hex cells (controls density)
wall = 1.5;             // Desired wall thickness between cells
cell_r = grid_r - wall / sqrt(3); // Derived hex cutout circumradius

// Chamfer parameters for the rim
chamfer_depth = 0.8;    // Depth of the chamfer on the rim edges

// Apple Logo Parameters
apple_logo_diameter = 50;  // Overall diameter/width of the apple logo
apple_logo_recess_depth = 1.0; // How deep the logo is cut into the base (z-direction)

// Derived apple logo dimensions (proportional to apple_logo_diameter)
apple_body_r_base = apple_logo_diameter / 2;
apple_lobe_r = apple_body_r_base * 0.45;     // Radius of top lobes
apple_bottom_curve_r = apple_body_r_base * 0.55; // Radius of bottom part
apple_bite_r = apple_body_r_base * 0.2;      // Radius of the bite
apple_notch_w = apple_body_r_base * 0.15;    // Width of the top notch for the stem
apple_stem_w = apple_body_r_base * 0.08;     // Width of the stem
apple_stem_h = apple_body_r_base * 0.15;     // Height of the stem
apple_leaf_w = apple_body_r_base * 0.25;     // Width of the leaf
apple_leaf_l = apple_body_r_base * 0.4;      // Length of the leaf (when flattened)
apple_leaf_angle = 45;                       // Angle of the leaf in degrees
apple_leaf_offset_x = apple_stem_w * 1.5;    // X-offset for leaf from stem
apple_leaf_offset_y = apple_lobe_r * 1.05 + apple_leaf_l * 0.2; // Y-offset for leaf


module hex_lattice() {
    intersection() {
        cylinder(h = coaster_h, d = coaster_d - border_w * 2);
        difference() {
            cylinder(h = coaster_h, d = coaster_d);
            for (q = [-8 : 8])
                for (r = [-8 : 8]) {
                    x = grid_r * sqrt(3) * (q + r / 2);
                    y = grid_r * 1.5 * r;
                    // Clip hex cells to the inner diameter of the lattice
                    if (sqrt(x*x + y*y) < (coaster_d - border_w * 2) / 2)
                        translate([x, y, -1])
                            cylinder(h = coaster_h + 2, r = cell_r, $fn = 6); // Use $fn=6 for hex cells
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
        translate([0, 0, coaster_h + rim_h - chamfer_depth])
            difference() {
                cylinder(h = chamfer_depth + 1, r = coaster_d / 2 + 1);
                cylinder(h = chamfer_depth + 1, r1 = coaster_d / 2, r2 = coaster_d / 2 - chamfer_depth);
            }
        // Bottom chamfer
        translate([0, 0, -1])
            difference() {
                cylinder(h = chamfer_depth + 1, r = coaster_d / 2 + 1);
                cylinder(h = chamfer_depth + 1, r1 = coaster_d / 2 - chamfer_depth, r2 = coaster_d / 2);
            }
    }
}

module apple_logo_cutout_shape() {
    // Extrude slightly more than recess_depth to ensure a clean cut
    logo_extrusion_height = apple_logo_recess_depth + 0.2;

    linear_extrude(height = logo_extrusion_height, center = false) {
        union() {
            // Main apple body (2D outline)
            difference() {
                hull() {
                    // Top lobes circles
                    translate([-apple_lobe_r * 0.6, apple_lobe_r * 0.4, 0]) circle(r = apple_lobe_r);
                    translate([apple_lobe_r * 0.6, apple_lobe_r * 0.4, 0]) circle(r = apple_lobe_r);
                    // Bottom curve circle
                    translate([0, -apple_lobe_r * 0.5, 0]) circle(r = apple_bottom_curve_r);
                }

                // Bite cutout
                translate([0, -apple_bottom_curve_r * 1.15, 0]) circle(r = apple_bite_r);

                // Stem notch cutout (creating a 'V' shape using hull of two small circles)
                translate([0, apple_lobe_r * 0.9, 0])
                    hull() {
                        circle(r = apple_notch_w / 2, $fn=24); // Use moderate $fn for small details
                        translate([0, apple_lobe_r * 0.4, 0]) circle(r = 0.1, $fn=24); // Small point to make V-shape
                    }
            }

            // Stem (2D rectangle)
            translate([0, apple_lobe_r * 1.0, 0])
                square([apple_stem_w, apple_stem_h], center = true);

            // Leaf (2D flattened circle/oval)
            translate([apple_leaf_offset_x, apple_leaf_offset_y, 0])
                rotate([0, 0, apple_leaf_angle])
                    scale([1, 0.5, 1]) // Flatten the circle to an oval
                        circle(r = apple_leaf_l / 2);
        }
    }
}

module apple_logo_positioned_cutout() {
    // Position the logo's bottom at -(recess_depth + some_epsilon) and its top at +some_epsilon
    // This ensures it cuts clean into the z=0 surface of the coaster (the bottom of the lattice).
    translate([0, 0, -apple_logo_recess_depth - 0.1]) // Move down to start cutting from below z=0
        apple_logo_cutout_shape();
}

// Assembly: Combine lattice and rim, then subtract the apple logo from the bottom
difference() {
    union() {
        hex_lattice();
        rim_ring();
    }
    apple_logo_positioned_cutout();
}