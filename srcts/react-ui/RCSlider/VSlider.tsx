/// <reference path="../../../typings/react/react.d.ts"/>

import * as React from "react";
import RCSlider from "./RCSlider";
import {SliderOption} from "./RCSlider";

export interface VSliderProps extends React.Props<VSlider> {
	min?:number;
    max?:number;
    step?:number;
    options?:SliderOption[];
	selectedValues?:string[];
    type:string;
    reversed?:boolean;
    onChange?:React.EventHandler<React.FormEvent>;
}

export default class VSlider extends React.Component<VSliderProps, any> {

    constructor(props:VSliderProps) {
        super(props);
    }

    render() {
        return <RCSlider {...this.props}/>;
    }
}
