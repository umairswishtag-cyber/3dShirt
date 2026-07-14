import Modal from '@/Components/Modal';

export default function ResetDesignDialog({ show, onClose, onConfirm }) {
    return (
        <Modal show={show} maxWidth="md" onClose={onClose}>
            <div className="p-6">
                <h2 className="text-lg font-bold text-slate-950">Reset this design?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                    All shirt colors and uploaded images will return to their defaults. Your saved local draft will also be removed.
                </p>
                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="min-h-10 rounded-xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700"
                    >
                        Reset design
                    </button>
                </div>
            </div>
        </Modal>
    );
}

