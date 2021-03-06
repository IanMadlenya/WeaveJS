namespace weavejs.ui
{
	import LinkableVariable = weavejs.core.LinkableVariable;
	import HBox = weavejs.ui.flexbox.HBox;
	import VBox = weavejs.ui.flexbox.VBox;
	import ReactUtils = weavejs.util.ReactUtils;
	import Menu = weavejs.ui.menu.Menu;

	export interface StatefulTextFieldProps extends React.HTMLProps<StatefulTextField> {
		selectOnFocus?:boolean;
		fluid?:boolean;
	}

	export interface StatefulTextFieldState {
		value: string|string[];
	}

	export class StatefulTextField extends React.Component<StatefulTextFieldProps, StatefulTextFieldState>
	{
		constructor(props: StatefulTextFieldProps) {
			super(props);
			this.state = {
				value: props.value
			};
		}

		static defaultProps:StatefulTextFieldProps = {
			fluid:true,
			disabled:false
		};

		public input:Input;
		
		handleSelectOnFocus = () =>
		{
			if (this.props.selectOnFocus)
			{
				this.input.inputElement.select();
			}
		};

		handleInputChange = (event: React.FormEvent): void=> {
			let value = (event.target as HTMLInputElement).value;
			this.setState({ value: value || ""});
		};

		render(): JSX.Element {
			return (
				<Input type="text"
						{...this.props as any}
						ref={(input:Input) => this.input = input}
						onChange={this.handleInputChange}
						onBlur={this.handleInputChange}
						onSubmit={this.handleInputChange}
						onFocus={this.handleSelectOnFocus}
						value={this.state.value}
				/>
			);
		}
	}
}
