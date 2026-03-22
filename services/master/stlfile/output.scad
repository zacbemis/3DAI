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