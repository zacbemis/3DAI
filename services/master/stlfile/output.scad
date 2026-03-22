$fn = 120;

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