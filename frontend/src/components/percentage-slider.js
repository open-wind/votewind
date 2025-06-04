'use client';

import { useState } from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import 'rc-tooltip/assets/bootstrap.css';
import Tooltip from 'rc-tooltip';

const Handle = Slider.Handle;

export default function PercentageSlider({ initial = 50, onChange }) {
  const [value, setValue] = useState(initial);

  const handleChange = (val) => {
    setValue(val);
    if (onChange) onChange(val);
  };

  const handle = (props) => {
    const { value, dragging, index, ...restProps } = props;
    return (
      <Tooltip
        prefixCls="rc-slider-tooltip"
        overlay={`${value}%`}
        visible={true}
        placement="top"
        key={index}
      >
        <Handle value={value} {...restProps} />
      </Tooltip>
    );
  };

  return (
    <Slider
    min={0}
    max={100}
    value={value}
    onChange={handleChange}
    handle={handle}
    trackStyle={{ backgroundColor: '#3b82f6' }}
    handleStyle={{ borderColor: '#3b82f6' }}
    />
  );
}
