import * as React from "react";
import {CSSProperties} from "react";
import prefixer from "../react-ui/VendorPrefixer";
import * as _ from "lodash";

export interface IRow
{
    [columnId:string]: string
};

export interface ITableRowProps extends React.Props<TableRow>
{
    row:IRow;
    idProperty:string;
    onMouseOver:() => void;
    onMouseDown:() => void;
    probed:boolean;
    selected:boolean;
    showIdColumn:boolean;
}

export interface ITableRowState
{
}

const baseStyle:CSSProperties = {
    userSelect: "none"
};

export default class TableRow extends React.Component<ITableRowProps, ITableRowState>
{
    private selectedStyle:CSSProperties;
    private clear:CSSProperties;
    private probedStyle:CSSProperties;
    private probedAndSelected:CSSProperties;

    constructor(props:ITableRowProps)
	{
        super(props);

        this.selectedStyle = {
            backgroundColor: "#80CCFF"
        };

        this.clear = {};

        this.probedAndSelected = {
            backgroundColor: "#99D6FF"
        };

        this.probedStyle = {
            backgroundColor: "rgba(153, 214, 255, 0.4)"
        }
    }

    shouldComponentUpdate(nextProps:ITableRowProps, nextState:ITableRowState)
	{
        // only update the row if the key has changed
        return (this.props.selected != nextProps.selected) ||
               (this.props.probed != nextProps.probed) ||
               (!_.isEqual(this.props.row, nextProps.row));
    }

    render():JSX.Element
	{
        var style = {};
        var selected:boolean = this.props.selected;
        var probed:boolean = this.props.probed;

        if (selected && probed)
            style = this.probedAndSelected;
        if (selected && !probed)
            style = this.selectedStyle;
        if (!selected && probed)
            style = this.probedStyle;
        if (!selected && !probed)
            style = this.clear;

        _.merge(style, baseStyle);

        var cells:JSX.Element[] = [];

        var keys:string[] = Object.keys(this.props.row);
        if (!this.props.showIdColumn)
            keys.splice(keys.indexOf(this.props.idProperty), 1);
        cells = keys.map((key:string) => {
            return <td key={key}>{this.props.row[key]}</td>;
        });

        return (
            <tr style={prefixer(style)} onMouseOver={this.props.onMouseOver.bind(this, true)} onMouseOut={this.props.onMouseOver.bind(this, false)} onMouseDown={this.props.onMouseDown.bind(this)}>
                {
                    cells
                }
            </tr>
        );
    }
}