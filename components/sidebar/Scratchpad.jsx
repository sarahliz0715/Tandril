import React, { useState, useEffect } from 'react';
import { ScratchpadNote } from '@/api/entities';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit, Save, X, Pin, PinOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Scratchpad() {
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [editingNote, setEditingNote] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadNotes();
    }, []);

    const loadNotes = async () => {
        setIsLoading(true);
        try {
            const fetchedNotes = await ScratchpadNote.list('-created_at');
            setNotes(fetchedNotes);
        } catch (error) {
            toast.error("Failed to load notes.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        try {
            await ScratchpadNote.create({ content: newNote });
            setNewNote('');
            loadNotes();
            toast.success("Note added!");
        } catch (error) {
            toast.error("Failed to add note.");
        }
    };

    const handleDeleteNote = async (id) => {
        try {
            await ScratchpadNote.delete(id);
            loadNotes();
            toast.success("Note deleted.");
        } catch (error) {
            toast.error("Failed to delete note.");
        }
    };

    const handleUpdateNote = async () => {
        if (!editingNote || !editingNote.content.trim()) return;
        try {
            await ScratchpadNote.update(editingNote.id, { content: editingNote.content });
            setEditingNote(null);
            loadNotes();
            toast.success("Note updated.");
        } catch (error) {
            toast.error("Failed to update note.");
        }
    };
    
    const handleTogglePin = async (note) => {
        try {
            await ScratchpadNote.update(note.id, { is_pinned: !note.is_pinned });
            loadNotes();
        } catch(e) {
            toast.error("Failed to update pin status.");
        }
    };

    const sortedNotes = [...notes].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
    });

    return (
        <div className="flex flex-col h-full max-h-[60vh] lg:max-h-full lg:w-full">
            <div className="p-4 border-b">
                <h3 className="font-semibold text-lg">Scratchpad</h3>
                <p className="text-sm text-slate-500">Jot down quick ideas and thoughts.</p>
            </div>
            
            <div className="p-4 space-y-2">
                 <Textarea
                    placeholder="Type your new note here..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[80px]"
                />
                <Button onClick={handleAddNote} className="w-full" size="sm">
                    <Plus className="w-4 h-4 mr-2" /> Add Note
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 pt-0 space-y-3">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-32">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                    ) : sortedNotes.length > 0 ? (
                        sortedNotes.map(note => (
                            <div key={note.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 group">
                                {editingNote && editingNote.id === note.id ? (
                                    <div className="space-y-2">
                                        <Textarea
                                            value={editingNote.content}
                                            onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                                            className="min-h-[70px]"
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <Button variant="ghost" size="sm" onClick={() => setEditingNote(null)}>
                                                <X className="w-4 h-4 mr-1" /> Cancel
                                            </Button>
                                            <Button size="sm" onClick={handleUpdateNote}>
                                                <Save className="w-4 h-4 mr-1" /> Save
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm text-slate-800 whitespace-pre-wrap">{note.content}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-xs text-slate-400">
                                                {new Date(note.created_at).toLocaleDateString()}
                                            </span>
                                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleTogglePin(note)}>
                                                    {note.is_pinned ? <PinOff className="w-4 h-4 text-indigo-600" /> : <Pin className="w-4 h-4 text-slate-500" />}
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingNote(note)}>
                                                    <Edit className="w-4 h-4 text-slate-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteNote(note.id)}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-sm text-slate-500">No notes yet. Add one above!</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}