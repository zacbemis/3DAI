$fn = 120;

// --- Dimensions ---

// Trunk dimensions
trunk_base_radius = 10; // mm
trunk_top_radius = 7; // mm (for slight taper)
trunk_height = 70; // mm

// Canopy dimensions
canopy_sphere_main_radius = 16; // mm (radius for main leaf clusters)
canopy_sphere_offset_factor_x = 0.5; // Factor to offset auxiliary spheres
canopy_sphere_offset_factor_y = 0.7; // Factor to offset auxiliary spheres
canopy_sphere_offset_factor_z = 0.8; // Factor to offset auxiliary spheres
canopy_sphere_scale_factor_1 = 0.8; // Scale for first auxiliary sphere
canopy_sphere_scale_factor_2 = 0.9; // Scale for second auxiliary sphere
canopy_sphere_scale_factor_3 = 0.85; // Scale for third auxiliary sphere
canopy_sphere_scale_factor_4 = 0.75; // Scale for fourth auxiliary sphere

// --- Components ---

module trunk() {
    color("brown") {
        cylinder(h = trunk_height, r1 = trunk_base_radius, r2 = trunk_top_radius, center = false);
    }
}

module canopy() {
    color("green") {
        union() {
            // Main central leaf cluster
            translate([0, 0, trunk_height + canopy_sphere_main_radius * 0.5]) {
                sphere(r = canopy_sphere_main_radius);
            }

            // Auxiliary leaf clusters for a more organic shape
            translate([
                canopy_sphere_main_radius * canopy_sphere_offset_factor_x, 
                canopy_sphere_main_radius * canopy_sphere_offset_factor_y, 
                trunk_height + canopy_sphere_main_radius * canopy_sphere_offset_factor_z * 1.0
            ]) {
                sphere(r = canopy_sphere_main_radius * canopy_sphere_scale_factor_1);
            }
            translate([
                -canopy_sphere_main_radius * canopy_sphere_offset_factor_y, 
                canopy_sphere_main_radius * canopy_sphere_offset_factor_x, 
                trunk_height + canopy_sphere_main_radius * canopy_sphere_offset_factor_z * 0.8
            ]) {
                sphere(r = canopy_sphere_main_radius * canopy_sphere_scale_factor_2);
            }
            translate([
                canopy_sphere_main_radius * canopy_sphere_offset_factor_x * 0.8, 
                -canopy_sphere_main_radius * canopy_sphere_offset_factor_y * 1.2, 
                trunk_height + canopy_sphere_main_radius * canopy_sphere_offset_factor_z * 0.9
            ]) {
                sphere(r = canopy_sphere_main_radius * canopy_sphere_scale_factor_3);
            }
            translate([
                -canopy_sphere_main_radius * canopy_sphere_offset_factor_y * 1.1, 
                -canopy_sphere_main_radius * canopy_sphere_offset_factor_x * 0.9, 
                trunk_height + canopy_sphere_main_radius * canopy_sphere_offset_factor_z * 1.1
            ]) {
                sphere(r = canopy_sphere_main_radius * canopy_sphere_scale_factor_4);
            }
        }
    }
}

// --- Assembly ---

module tree() {
    trunk();
    canopy();
}

tree();
// Dimensions
width = 180;
depth = 120;
height = 65;
wall = 3;
bottom = 3;
corner_r = 8;
div_t = 2.5;

// Section widths (left to right)
pen_w = 45;      // tall items
card_w = 65;     // business cards, notes  
misc_w = 70;     // misc small items

module rbox(w, d, h, r) {
    hull() {
        translate([r, r, 0]) cylinder(r=r, h=h);
        translate([w-r, r, 0]) cylinder(r=r, h=h);
        translate([r, d-r, 0]) cylinder(r=r, h=h);
        translate([w-r, d-r, 0]) cylinder(r=r, h=h);
    }
}

module desk_organizer() {
    difference() {
        // Main body
        rbox(width, depth, height, corner_r);
        
        // Pen/pencil compartment (left)
        translate([wall, wall, bottom])
            cube([pen_w - wall - div_t/2, depth - 2*wall, height]);
            
        // Card/note compartment (center) 
        translate([pen_w + div_t/2, wall, bottom])
            cube([card_w - div_t, depth - 2*wall, height]);
            
        // Misc compartment (right)
        translate([pen_w + card_w + div_t/2, wall, bottom])
            cube([misc_w - wall - div_t/2, depth - 2*wall, height]);
            
        // Front divider in card section for business cards
        translate([pen_w + div_t/2 + wall, wall, bottom])
            cube([card_w - div_t - 2*wall, 35, height]);
            
        // Rear tray in card section for paper clips
        translate([pen_w + div_t/2 + wall, 50, bottom])
            cube([card_w - div_t - 2*wall, depth - 2*wall - 50, height]);
    }
}

translate([-width/2, -depth/2, 0]) desk_organizer();
