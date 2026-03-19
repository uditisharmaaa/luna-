import { useState, useEffect } from 'react'
import { Button } from './ui'
import type { Todo } from '../types/electron'

interface TodoListProps {
  date: string
}

export default function TodoList({ date }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [newText, setNewText] = useState('')

  const loadTodos = async () => {
    const data = await window.electronAPI.getTodos(date)
    setTodos(data)
  }

  useEffect(() => { loadTodos() }, [date])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = newText.trim()
    if (!text) return
    await window.electronAPI.addTodo(date, text)
    setNewText('')
    loadTodos()
  }

  const handleToggle = async (todo: Todo) => {
    await window.electronAPI.updateTodo(todo.id, { completed: todo.completed ? 0 : 1 })
    loadTodos()
  }

  const handleDelete = async (id: number) => {
    await window.electronAPI.deleteTodo(id)
    loadTodos()
  }

  const completedCount = todos.filter(t => t.completed).length

  return (
    <div className="space-y-3">
      {/* Add todo form */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="Add a task..."
          className="flex-1 px-3 py-2 rounded-lg text-sm bg-[#FFF8F0] border border-[#C9B8E8]/40 text-[#3D3250] placeholder-[#8B7D9B] outline-none focus:border-[#C9B8E8] transition-colors"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        />
        <Button type="submit" variant="primary" size="sm">+</Button>
      </form>

      {/* Progress indicator */}
      {todos.length > 0 && (
        <p className="text-xs text-[#8B7D9B]">
          {completedCount}/{todos.length} done
        </p>
      )}

      {/* Todo items */}
      <ul className="space-y-2">
        {todos.map(todo => (
          <li
            key={todo.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg group transition-all duration-200 ${
              todo.completed ? 'opacity-60' : ''
            }`}
            style={{ background: 'rgba(245, 237, 224, 0.5)' }}
          >
            <button
              onClick={() => handleToggle(todo)}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                todo.completed
                  ? 'bg-[#B8D4C0] border-[#B8D4C0]'
                  : 'border-[#C9B8E8] hover:border-[#9B8BC8]'
              }`}
            >
              {todo.completed ? <span className="text-white text-xs">✓</span> : null}
            </button>
            <span
              className={`flex-1 text-sm ${todo.completed ? 'line-through text-[#8B7D9B]' : 'text-[#3D3250]'}`}
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {todo.text}
            </span>
            <button
              onClick={() => handleDelete(todo.id)}
              className="opacity-0 group-hover:opacity-100 text-[#8B7D9B] hover:text-rose-400 text-xs transition-all"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {/* Empty state */}
      {todos.length === 0 && (
        <div className="text-center py-6 text-[#8B7D9B]">
          <div className="text-2xl mb-2">✦</div>
          <p className="text-sm">No tasks yet. What will you do today?</p>
        </div>
      )}
    </div>
  )
}
