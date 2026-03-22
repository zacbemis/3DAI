$fn = 120;

// Stool dimensions
seat_d = 300;
seat_h = 25;
leg_d = 40;
leg_h = 450;
leg_count = 3;
corner_r = 8;

module rounded_cylinder(d, h, r) {
    hull() {
        translate([0, 0, r])
            cylinder(d = d - 2*r, h = h - 2*r);
        translate([0, 0, r])
            torus(d - 2*r, r);
        translate([0, 0, h - r])
            torus(d - 2*r, r);
    }
}

module torus(d, r) {
    rotate_extrude()
        translate([d/2, 0, 0])
            circle(r = r);
}

module seat() {
    hull() {
        cylinder(d = seat_d - 2*corner_r, h = seat_h);
        translate([0, 0, corner_r])
            torus(seat_d - 2*corner_r, corner_r);
        translate([0, 0, seat_h - corner_r])
            torus(seat_d - 2*corner_r, corner_r);
    }
}

module leg() {
    hull() {
        cylinder(d = leg_d - 2*corner_r, h = leg_h);
        translate([0, 0, corner_r])
            torus(leg_d - 2*corner_r, corner_r);
        translate([0, 0, leg_h - corner_r])
            torus(leg_d - 2*corner_r, corner_r);
    }
}

module legs() {
    for (i = [0:leg_count-1]) {
        rotate([0, 0, i * 360/leg_count])
            translate([seat_d/2 - leg_d/2 - 15, 0, 0])
                leg();
    }
}

seat();
legs();