import math

num_ticks = 7
steps = (1.0, 2.0, 2.5, 5.0, 10.0)


def _nice_step(value: float) -> float:
    exponent = math.floor(math.log10(value))
    mantissa = value / (10 ** exponent)
    step = min(x for x in steps if x >= mantissa)
    return step * (10 ** exponent)


def nice_min_max(dmin: float, dmax: float) -> tuple[float, float]:
    if dmin == dmax:
        if dmin == 0.0:
            step = 1.0
        else:
            step = _nice_step(abs(dmin)) / 2.0

        return dmin - step, dmax + step

    value_range = dmax - dmin
    target_steps = value_range / (num_ticks - 1)
    step = _nice_step(target_steps)
    vmin = math.floor(dmin / step) * step
    vmax = math.ceil(dmax / step) * step

    return vmin, vmax
