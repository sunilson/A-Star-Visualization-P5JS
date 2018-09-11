const canvasWidth = window.innerWidth
const canvasHeight = window.innerHeight
const rectSize = 20
const txtSize = 5
const columns = canvasWidth / rectSize
const rows = canvasHeight / rectSize

const values = []
let openList = []
let closedList = []
let finalPath = []
let running = false
let allowDiagonal = true

if (confirm('Allow diagonal paths?')) {
    allowDiagonal = true
} else {
    allowDiagonal = false
}

const difficulty = parseFloat(prompt("Enter difficulty between 0 (impossible) and 1.0 (easy)", "0.7")) || 0.7
const speed = parseInt(prompt("Enter computation cycles per frame", "1")) || 1

//Helper class for all points
class Point {
    constructor(x, y, parent, cost) {
        this.x = x
        this.y = y
        this.parent = parent
        this.H = 0
        this.G = cost
    }

    compare(x, y) {
        return this.x === x && this.y === y
    }

    comparePoint(point) {
        return this.x === point.x && this.y === point.y
    }

    get F() {
        return this.H + this.G
    }

    //Recalculates the H weight of this point (Manhattan distance to end point)
    calculateHWeight(endPoint) {
        let x = this.x
        let y = this.y
        let cost = 0

        while (x != endPoint.x || y != endPoint.y) {
            if (x < endPoint.x) {
                x++
                cost += 10
            } else if (x > endPoint.x) {
                x--
                cost += 10
            }

            if (y < endPoint.y) {
                y++
                cost += 10
            } else if (y > endPoint.y) {
                y--
                cost += 10
            }
        }

        this.H = cost
    }
}

let startingPoint = null
let endPoint = null


//Create canvas and randomize obstacles
function setup() {
    createCanvas(canvasWidth, canvasHeight)
    for (let i = 0; i < rows; i++) {
        values.push([])
        for (let j = 0; j < columns; j++) {
            (Math.random() < difficulty) ? values[i].push(0): values[i].push(1)
        }
    }
}

//React to user input
function mousePressed() {
    //Get click position
    let x = Math.floor(mouseX / rectSize)
    let y = Math.floor(mouseY / rectSize)

    if (finalPath.length > 0) {
        //Reset field
        reset()
    } else if (!running) {
        //Set start and end point
        if (values[y][x] != 1) {
            if (!startingPoint) {
                startingPoint = new Point(x, y, null, 0)
            } else if (!endPoint) {
                endPoint = new Point(x, y, null, 0)
                //Add starting point to open list
                openList.push(startingPoint)
                findPath()
                running = true
            }
        }
    }
}

//Draw all current lists
function draw() {
    drawGrid()

    openList.forEach(point => {
        stroke(0);
        fill(0, 255, 0)
        rect(point.x * rectSize, point.y * rectSize, rectSize - 1, rectSize - 1);
        /*
        textSize(txtSize)
        fill(0, 0, 0)
        text("G: " + point.G.toString(), point.x * rectSize, point.y * rectSize + txtSize)
        text("H: " + point.H.toString(), point.x * rectSize, point.y * rectSize + txtSize * 2)
        text("F: " + point.F.toString(), point.x * rectSize, point.y * rectSize + txtSize * 3)
        */
    })

    closedList.forEach(point => {
        stroke(0);
        fill(128, 128, 128)
        rect(point.x * rectSize, point.y * rectSize, rectSize - 1, rectSize - 1);
    })

    finalPath.forEach(point => {
        stroke(0);
        fill(255, 0, 0)
        rect(point.x * rectSize, point.y * rectSize, rectSize - 1, rectSize - 1);
    })

    if (running) {
        for (let i = 0; i < speed; i++) {
            if (!findPath()) break
        }
    }
}

//Initial drawing of the grid
function drawGrid() {
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < columns; j++) {
            if ((startingPoint && startingPoint.compare(j, i)) || (endPoint && endPoint.compare(j, i))) {
                fill(255, 0, 0)
            } else {
                (values[i][j] == 0) ? fill(255): fill(0);
            }

            stroke(0);
            rect(j * rectSize, i * rectSize, rectSize - 1, rectSize - 1);
        }
    }
}

//One iteration of path finding, repeats itself
function findPath() {
    if (openList.length == 0) {
        alert("NO PATH COULD BE FOUND")
        reset()
        return false
    } else {
        const lowest = getMinFPoint()
        if (lowest.comparePoint(endPoint)) {
            endPoint.parent = lowest
            calculateFinalPath()
            return false
        } else {
            removeFromOpenList(lowest)
            closedList.push(lowest)
            addSurroundingsToOpenList(lowest)
            return true
        }
    }
}

//Looks at all surrounding fields
function addSurroundingsToOpenList(point) {
    if (allowDiagonal) {
        //Get all walkable neighbour fields
        for (let i = Math.max(0, point.x - 1); i <= Math.min(point.x + 1, columns - 1); i++) {
            for (let j = Math.max(0, point.y - 1); j <= Math.min(point.y + 1, rows - 1); j++) {
                handleNeighbour(i, j, point)
            }
        }
    } else {
        if (point.y > 0) handleNeighbour(point.x, point.y - 1, point)
        if (point.x > 0) handleNeighbour(point.x - 1, point.y, point)
        if (point.x < columns - 1) handleNeighbour(point.x + 1, point.y, point)
        if (point.y < rows - 1) handleNeighbour(point.x, point.y + 1, point)
    }
}

function handleNeighbour(x, y, point) {
    if ((x != point.x || y != point.y) && values[y][x] != 1) {
        //Create new point with correct G weight
        let newPoint = (x == point.x || y == point.y) ? new Point(x, y, point, point.G + 10) : new Point(x, y, point, point.G + 14)

        //Check if already in open or closed list
        let oldOpen = isInOpenList(newPoint)
        let oldClosed = isInClosedList(newPoint)

        //If already in open list
        if (oldOpen) {
            //Check if G score is lower if we go over current square instead of original parent
            if (oldOpen.G > newPoint.G) {
                //Change parent and therefore G weight
                oldOpen.parent = point
                oldOpen.G = (x == point.x || y == point.y) ? point.G + 10 : point.G + 14
            }
        } else if (!oldOpen && !oldClosed) {
            //Not in open and not in closed list

            //Calculate H Weight
            newPoint.calculateHWeight(endPoint)

            //Add to open List
            openList.push(newPoint)
        }
    }
}

//Checks if point is in open list and returns point if it is
function isInOpenList(point) {
    for (let i = 0; i < openList.length; i++) {
        if (openList[i].comparePoint(point)) return openList[i]
    }
    return false
}

//Checks if point is in closed list and returns point if it is
function isInClosedList(point) {
    for (let i = 0; i < closedList.length; i++) {
        if (closedList[i].comparePoint(point)) return closedList[i]
    }
    return false
}

//Removes point from the open list
function removeFromOpenList(point) {
    openList.splice(openList.indexOf(point), 1)
}

//Traverse calculated path, beginning from end point
function calculateFinalPath() {
    running = false
    let currentPoint = endPoint
    while (true) {
        if (!currentPoint) break

        finalPath.push(currentPoint)
        currentPoint = currentPoint.parent
    }
}

//Get the point with currently lowest F weight
function getMinFPoint() {
    let result = null
    openList.forEach(point => {
        if (!result || result.F > point.F) {
            result = point
        }
    })
    return result
}

function reset() {
    running = false
    finalPath = []
    openList = []
    closedList = []
    startingPoint = null
    endPoint = null
}