const TetrisGame = {
    template: `
        <div class="game-container">
            <!-- 开始界面 -->
            <div v-if="!gameStarted" class="start-screen">
                <h1>俄罗斯方块</h1>
                <div class="difficulty-select">
                    <label>选择难度：</label>
                    <select v-model="selectedLevel">
                        <option v-for="(level, index) in levels" :value="index">{{ level.label }}</option>
                    </select>
                </div>
                <button @click="startGame" class="start-btn">开始游戏</button>
                <div class="controls-tip">
                    <p>操作说明：</p>
                    <p>← → 键：左右移动</p>
                    <p>↑ 键：旋转方块</p>
                    <p>↓ 键：加速下落</p>
                </div>
            </div>

            <!-- 游戏界面 -->
            <div v-else class="game-screen">
                <div class="game-info">
                    <div>得分：{{ score }}</div>
                    <div>等级：{{ levels[selectedLevel].label }}</div>
                    <div>下一个：</div>
                    <canvas ref="nextCanvas" width="100" height="100"></canvas>
                </div>
                <canvas ref="gameCanvas" :width="canvasWidth" :height="canvasHeight"></canvas>
            </div>
        </div>
    `,

    data() {
        return {
            

            gameStarted: false,
            selectedLevel: 0,
            levels: [
                { label: '简单', interval: 1000 },
                { label: '普通', interval: 700 },
                { label: '困难', interval: 400 }
            ],
            // 游戏参数
            canvasWidth: 300,
            canvasHeight: 600,
            blockSize: 30,
            score: 0,
            // 游戏状态
            currentPiece: null,
            nextPiece: null,
            gameMap: [],
            // 定时器
            dropInterval: null,
            lastDrop: 0,
            // 按键状态
            keys: {
                ArrowLeft: false,
                ArrowRight: false,
                ArrowDown: false,
                ArrowUp: false
            },
            lastMoveTime: 0, // 记录上次左右移动的时间戳
            moveInterval: 1000 // 设置左右移动的最小间隔（毫秒）
        }
    },

    created() {
        // 初始化游戏地图
        this.initGameMap()
        // 初始化方块形状
        this.shapes = this.createShapes()
    },

    mounted() {
        window.addEventListener('keydown', this.handleKeyDown)
        window.addEventListener('keyup', this.handleKeyUp)
    },

    beforeUnmount() {
        window.removeEventListener('keydown', this.handleKeyDown)
        window.removeEventListener('keyup', this.handleKeyUp)
    },

    methods: {

        handleMovement(timestamp) {
            const now = timestamp || Date.now(); // 获取当前时间戳
            if (this.keys.ArrowLeft && this.canMove(-1, 0) && now - this.lastMoveTime >= this.moveInterval) {
                this.currentPiece.x--
                this.lastMoveTime = now; // 更新上次移动的时间戳
            }
            if (this.keys.ArrowRight && this.canMove(1, 0) && now - this.lastMoveTime >= this.moveInterval) {
                this.currentPiece.x++
                this.lastMoveTime = now; // 更新上次移动的时间戳
            }
            if (this.keys.ArrowDown && this.canMove(0, 1)) {
                this.moveDown()
            }
            if (this.keys.ArrowUp) {
                this.rotatePiece()
                this.keys.ArrowUp = false
            }
        },
        // 初始化游戏地图
        initGameMap() {
            this.gameMap = Array(this.canvasHeight / this.blockSize).fill()
                .map(() => Array(this.canvasWidth / this.blockSize).fill(0))
        },

        // 创建方块形状
        createShapes() {
            return [
                { // I
                    shape: [[1,1,1,1]],
                    color: '#00f0f0'
                },
                { // O
                    shape: [[1,1],[1,1]],
                    color: '#f0f000'
                },
                { // T
                    shape: [[0,1,0],[1,1,1]],
                    color: '#a000f0'
                },
                { // L
                    shape: [[1,0],[1,0],[1,1]],
                    color: '#f0a000'
                },
                { // J
                    shape: [[0,1],[0,1],[1,1]],
                    color: '#0000f0'
                },
                { // S
                    shape: [[0,1,1],[1,1,0]],
                    color: '#00f000'
                },
                { // Z
                    shape: [[1,1,0],[0,1,1]],
                    color: '#f00000'
                }
            ]
        },

        // 游戏主循环
        gameLoop(timestamp) {
            if (!this.gameStarted) return

            const ctx = this.$refs.gameCanvas.getContext('2d')
            const nextCtx = this.$refs.nextCanvas.getContext('2d')
            
            // 处理移动
            this.handleMovement()

            // 自动下落
            if (timestamp - this.lastDrop > this.levels[this.selectedLevel].interval) {
                this.moveDown()
                this.lastDrop = timestamp
            }

            // 清除画布
            ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
            nextCtx.clearRect(0, 0, 100, 100)

            // 绘制地图
            this.drawMap(ctx)
            
            // 绘制当前方块
            if (this.currentPiece) {
                this.drawPiece(ctx, this.currentPiece)
                // 绘制下一个方块
                this.drawPiece(nextCtx, this.nextPiece, 20, 20)
            }

            requestAnimationFrame(this.gameLoop)
        },

        // 绘制方块
        drawPiece(ctx, piece, offsetX = 0, offsetY = 0) {
            ctx.fillStyle = piece.color
            piece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        ctx.fillRect(
                            (piece.x + x) * this.blockSize + offsetX,
                            (piece.y + y) * this.blockSize + offsetY,
                            this.blockSize - 1,
                            this.blockSize - 1
                        )
                    }
                })
            })
        },

        // 绘制地图
        drawMap(ctx) {
            this.gameMap.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        ctx.fillStyle = value
                        ctx.fillRect(
                            x * this.blockSize,
                            y * this.blockSize,
                            this.blockSize - 1,
                            this.blockSize - 1
                        )
                    }
                })
            })
        },

        // 创建新方块
        createNewPiece() {
            const shape = this.shapes[Math.floor(Math.random() * this.shapes.length)]
            return {
                ...shape,
                x: Math.floor(this.gameMap[0].length / 2) - 1,
                y: 0
            }
        },

        // 移动处理
        handleMovement() {
            if (this.keys.ArrowLeft && this.canMove(-1, 0)) {
                this.currentPiece.x--
            }
            if (this.keys.ArrowRight && this.canMove(1, 0)) {
                this.currentPiece.x++
            }
            if (this.keys.ArrowDown && this.canMove(0, 1)) {
                this.moveDown()
            }
            if (this.keys.ArrowUp) {
                this.rotatePiece()
                this.keys.ArrowUp = false
            }
        },

        // 旋转方块
        rotatePiece() {
            const rotated = this.currentPiece.shape[0].map((_, i) =>
                this.currentPiece.shape.map(row => row[i]).reverse()
            )
            const originalShape = this.currentPiece.shape
            this.currentPiece.shape = rotated
            if (!this.canMove(0, 0)) {
                this.currentPiece.shape = originalShape
            }
        },

        // 碰撞检测
        canMove(offsetX, offsetY) {
            return this.currentPiece.shape.every((row, y) => 
                row.every((value, x) => {
                    if (!value) return true
                    const newX = this.currentPiece.x + x + offsetX
                    const newY = this.currentPiece.y + y + offsetY
                    return (
                        newX >= 0 &&
                        newX < this.gameMap[0].length &&
                        newY < this.gameMap.length &&
                        !this.gameMap[newY]?.[newX]
                    )
                })
            )
        },

        // 下落处理
        moveDown() {
            if (this.canMove(0, 1)) {
                this.currentPiece.y++
            } else {
                this.lockPiece()
                this.clearLines()
                this.spawnNewPiece()
            }
        },

        // 固定方块
        lockPiece() {
            this.currentPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        const mapY = this.currentPiece.y + y
                        if (mapY < 0) {
                            this.gameOver()
                            return
                        }
                        this.gameMap[mapY][this.currentPiece.x + x] = this.currentPiece.color
                    }
                })
            })
        },

        // 消除行
        clearLines() {
            let linesCleared = 0
            for (let y = this.gameMap.length - 1; y >= 0; y--) {
                if (this.gameMap[y].every(cell => cell)) {
                    this.gameMap.splice(y, 1)
                    this.gameMap.unshift(Array(this.gameMap[0].length).fill(0))
                    linesCleared++
                    y++ // 重新检查当前行
                }
            }
            if (linesCleared > 0) {
                this.score += linesCleared * 100
            }
        },

        // 生成新方块
        spawnNewPiece() {
            this.currentPiece = this.nextPiece || this.createNewPiece()
            this.nextPiece = this.createNewPiece()
        },

        // 游戏开始
        startGame() {
            this.gameStarted = true
            this.initGameMap()
            this.score = 0
            this.spawnNewPiece()
            this.lastDrop = 0
            requestAnimationFrame(this.gameLoop)
        },

        // 游戏结束
        gameOver() {
            this.gameStarted = false
            alert(`游戏结束！得分：${this.score}`)
        },

        // 按键处理
        handleKeyDown(e) {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = true
                e.preventDefault()
            }
        },

        handleKeyUp(e) {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = false
            }
        }
    }
}