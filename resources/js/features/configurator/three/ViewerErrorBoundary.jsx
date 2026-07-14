import { Component } from 'react';

export default class ViewerErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error) {
        console.error('Configurator viewer failed:', error);
    }

    render() {
        if (this.state.error) {
            return (
                <div className="grid h-full min-h-80 place-items-center bg-slate-100 p-6 text-center">
                    <div className="max-w-sm rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
                        <p className="text-sm font-bold text-slate-900">The shirt could not be displayed</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            {this.state.error.message || 'Refresh the page or try another browser.'}
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

