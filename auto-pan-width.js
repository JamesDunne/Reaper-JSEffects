desc:Auto-pan based on stereo width ADSR

slider15:0<-90,0,0.01>Detected threshold (dB)

slider1:-18<-120,0,0.25>Open threshold (dB)
slider2:-15<-120,0,0.25>Close threshold (dB)
slider3:200<0,1000,.1>Attack time
slider4:500<0,2000,1>Release time

slider5:-1<-1,1,0.01>L auto-pan start
slider6:-1<-1,1,0.01>R auto-pan start
slider7:-1<-1,1,0.01>L auto-pan end
slider8:0<-1,1,0.01>R auto-pan end

slider16:-3<-24,0,0.25>Output gain (dB)

@init
HALF_PI = 0.5*$pi;
sample_len_msec = 1000/srate;

// window length = 10ms
win_len = 10*0.001*srate;
// filter coefficients
b1 = exp(-1/win_len);    // tau
a0 = 1 - b1;             // normalize filter output

adsr_state = 0;
adsr_out = 0;

function do_pan_l(samp, pan) (
  samp*cos((.5+pan*.5)*HALF_PI);
);
function do_pan_r(samp, pan) (
  samp*sin((.5+pan*.5)*HALF_PI);
);

@slider
adsr_open_dB = slider1;
adsr_close_dB = slider2;
adsr_atk_slider = slider3;
adsr_rel_slider = slider4;
pan_l_start = slider5;
pan_l_end = slider7;
pan_l_delta = (pan_l_end - pan_l_start);
pan_r_start = slider6;
pan_r_end = slider8;
pan_r_delta = (pan_r_end - pan_r_start);
out_gain = 2^(slider16 / 6);

@sample
s0=spl0; s1=spl1;

// Find RMS of difference of L/R:
diff=s0-s1;
// filter
diff_fout = a0*(diff*diff) + b1*diff_fout;
// get rms
diff_rms = sqrt(diff_fout);
// calc rms dB
diff_rms_dB = 10 * log10(diff_rms);

slider15 = diff_rms_dB;
sliderchange(slider15);

// ADSR state machine to move adsr_out from 0 to 1 and back to 0 smoothly depending on ADSR envelope parameters:
(adsr_state === 0)?(
  // Watching:
  (diff_rms_dB>=adsr_open_dB)?(
    adsr_atk_time = adsr_atk_slider;
    adsr_atk_timer = adsr_atk_time;
    adsr_out = 0;
    adsr_state = 1;
  );
):(adsr_state === 1)?(
  // Attacking:
  adsr_out = (adsr_atk_time - adsr_atk_timer) / adsr_atk_time;
  (adsr_atk_timer>0)?(
    adsr_atk_timer-=sample_len_msec;
  ):(
    adsr_out = 1;
    adsr_atk_timer = 0;
    adsr_state = 2;
  )
):(adsr_state === 2)?(
  // Sustaining:
  // TODO(jsd): could add a hold timer here to wait to release.
  (diff_rms_dB<adsr_close_dB)?(
    adsr_rel_time = adsr_rel_slider;
    adsr_rel_timer = adsr_rel_time;
    adsr_state = 3;
  );
):(adsr_state === 3)?(
  // Releasing:
  adsr_out = adsr_rel_timer / adsr_rel_time;
  (adsr_rel_timer>0)?(
    adsr_rel_timer-=sample_len_msec;
  ):(
    adsr_rel_timer = 0;
    adsr_state = 0;
    adsr_out = 0;
  );
);

// Final output mixing:
pan_l = pan_l_start+adsr_out*pan_l_delta;
pan_r = pan_r_start+adsr_out*pan_r_delta;

ns0=out_gain*(do_pan_l(s0, pan_l)+do_pan_l(s1, pan_r));
ns1=out_gain*(do_pan_r(s0, pan_l)+do_pan_r(s1, pan_r));

spl0=ns0;
spl1=ns1;
