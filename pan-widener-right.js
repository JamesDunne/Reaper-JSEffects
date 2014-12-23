desc:Stereo conditional pan right

@init
// window length = 150ms
win_len = 150*0.001*srate;
// filter coefficients
b1 = exp(-1/win_len);    // tau
a0 = 1 - b1;             // normalize filter output

thr = 0.04;
inv_thr = 1 / thr;

HALF_PI = 0.5*3.14159265358979323846;

@sample
s0=spl0; s1=spl1;

// Find RMS of difference of L/R:
diff=s0-s1;
// filter
diff_fout = a0*(diff*diff) + b1*diff_fout;
// get rms
diff_rms = sqrt(diff_fout);
//diff_rms_dB = 20 * log10(diff_rms);

pan_from_r = min(diff_rms, thr) * inv_thr * 0.50;

spl0=s1*cos((1-pan_from_r)*HALF_PI);
spl1=s1*cos((  pan_from_r)*HALF_PI) + s0;

