import type { WhiteboardData } from '.'
import { remove, type Pred } from '../utils'
import { type Shape, type PreShape, removeShapes, addShapeRel } from './graphic'

export type Action =
    | AddShapeAction
    | RemoveShapesAction

export interface AddShapeAction {
    type: 'add_shape'
    shape: Shape
}

export interface RemoveShapesAction {
    type: 'remove_shapes'
    shapes: Shape[]
}

export const pushAction = (data: WhiteboardData, action: Action) => {
    data.history.splice(data.historyIndex)
    data.history.push(action)
    data.historyIndex ++
}

export const undoAction = (data: WhiteboardData) => {
    if (! data.historyIndex) return

    const action = data.history[-- data.historyIndex]

    switch (action.type) {
        case 'add_shape':
            remove(data.shapes, it => it.id === action.shape.id)
            break
        case 'remove_shapes':
            data.shapes.push(...action.shapes)
            break
    }
}

export const redoAction = (data: WhiteboardData) => {
    if (data.historyIndex === data.history.length) return

    const action = data.history[data.historyIndex ++]

    switch (action.type) {
        case 'add_shape':
            data.shapes.push(action.shape)
            break
        case 'remove_shapes':
            const removedShapeIds = action.shapes.map(it => it.id)
            removeShapes(data, it => removedShapeIds.includes(it.id))
            break
    }
}

export const addShapeA = (data: WhiteboardData, preShape: PreShape) => {
    const shapeHandle = addShapeRel(data, preShape)
    pushAction(data, { type: 'add_shape', shape: shapeHandle.shape })
    return shapeHandle
}

export const removeShapesA = (data: WhiteboardData, pred: Pred<Shape>) => {
    const removed = removeShapes(data, pred)
    if (removed.length) pushAction(data, { type: 'remove_shapes', shapes: removed })
    return removed
}