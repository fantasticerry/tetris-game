const TetrisGame = {
    template: `
        <div class="game-container">
            <!-- 开始界面 -->
            <div v-if="!gameStarted" class="start-screen">
                <h1>惘三和YC方块</h1>
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
                    <p>空格 键：游戏暂停</p>
                </div>
            </div>

            <!-- 游戏界面 -->
            <div v-else class="game-screen">
                <div class="game-background"></div> <!-- 新增背景层 -->
                <div class="game-info">
                    <div>得分：{{ score }}</div>
                    <div>等级：{{ levels[selectedLevel].label }}</div>
                    <div>下一个：</div>
                    <canvas ref="nextCanvas" width="100" height="100"></canvas>
                    <!-- 添加暂停状态显示 -->
                    <div v-if="isPaused" class="pause-overlay">
                        <div class="pause-text">游戏已暂停</div>
                        <div class="pause-tip">按空格键继续吧孩子，再暂停也拦不住寄的命运</div>
                    </div>
                </div>
                <canvas ref="gameCanvas" :width="canvasWidth" :height="canvasHeight"></canvas>
            </div>
        </div>
    `,

    data() {
        return {

            isPaused: false, // 新增暂停状态
             // 新增移动控制参数
            lastMoveTime: 0,
            moveInterval: 100, // 移动间隔时间（毫秒）
            // 其他数据保持不变...
            gameStarted: false,
            selectedLevel: 0,
            levels: [
                { label: '不如人机', interval: 800 },
                { label: '人机', interval: 600 },
                { label: '拟人', interval: 300 },
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
                    color: 'rgba(0, 255, 255, 0.59)',
                },
                { // O
                    shape: [[1,1],[1,1]],
                    color: 'rgba(255, 255, 0, 0.59)'
                },
                { // T
                    shape: [[0,1,0],[1,1,1]],
                    color: 'rgba(255, 0, 255, 0.59)'
                },
                { // L
                    shape: [[1,0],[1,0],[1,1]],
                    color: 'rgba(255, 165, 0, 0.59)'
                },
                { // J
                    shape: [[0,1],[0,1],[1,1]],
                    color: 'rgba(0, 0, 255, 0.59)'
                },
                { // S
                    shape: [[0,1,1],[1,1,0]],
                    color: 'rgba(0, 255, 0, 0.59)'
                },
                { // Z
                    shape: [[1,1,0],[0,1,1]],
                    color: 'rgba(255, 0, 0, 0.59)'
                }
            ]
        },

        // 游戏主循环
        gameLoop(timestamp) {
            if (!this.gameStarted || this.isPaused) { // 添加暂停判断
                requestAnimationFrame(this.gameLoop)
                return
            }
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
                // this.drawPiece(nextCtx, this.nextPiece, 50, 50)
            }
            // 绘制下一个方块（添加居中逻辑）
            if (this.nextPiece) {
                const nextBlockSize = 15 // 预览方块尺寸
                const shapeWidth = this.nextPiece.shape[0].length * nextBlockSize
                const shapeHeight = this.nextPiece.shape.length * nextBlockSize
                const offsetX = (100 - shapeWidth) / 2
                const offsetY = (100 - shapeHeight) / 2
                this.drawNextPiece(nextCtx, this.nextPiece, offsetX, offsetY, nextBlockSize)
            }

            requestAnimationFrame(this.gameLoop)
        },
                // 新增暂停方法
        togglePause() {
            if (this.gameStarted) {
                this.isPaused = !this.isPaused
                if (!this.isPaused) {
                    this.lastDrop = performance.now() // 重置下落计时
                    requestAnimationFrame(this.gameLoop)
                }
            }
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

                // 绘制下一个图标方法（添加缩放功能）
                drawNextPiece(ctx, piece, offsetX = 0, offsetY = 0, blockSize = null) {
                    const size = blockSize || this.blockSize
                    ctx.fillStyle = piece.color
                    piece.shape.forEach((row, y) => {
                        row.forEach((value, x) => {
                            if (value) {
                                ctx.fillRect(
                                    x * size + offsetX,
                                    y * size + offsetY,
                                    size - 1,
                                    size - 1
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

        // 修改后的移动处理（添加移动间隔控制）
        handleMovement() {
            const now = Date.now()
            if (this.keys.ArrowLeft && this.canMove(-1, 0)) {
                if (now - this.lastMoveTime > this.moveInterval) {
                    this.currentPiece.x--
                    this.lastMoveTime = now
                }
            }
            if (this.keys.ArrowRight && this.canMove(1, 0)) {
                if (now - this.lastMoveTime > this.moveInterval) {
                    this.currentPiece.x++
                    this.lastMoveTime = now
                }
            }
            if (this.keys.ArrowDown && this.canMove(0, 1)) {
                if (now - this.lastMoveTime > this.moveInterval/10) {
                this.currentPiece.y++
                this.lastMoveTime = now
            }
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
            
            // 立即检测是否碰撞（触顶判定）
            if (!this.canMove(0, 0)) {
                this.gameOver()
            }
        },

        // 游戏开始
        startGame() {
            this.gameStarted = true
            this.isPaused = false // 重置暂停状态
            // 原有逻辑保持不变...
            this.initGameMap()
            this.score = 0
            this.spawnNewPiece()
            this.lastDrop = 0
            requestAnimationFrame(this.gameLoop)
        },

        // 游戏结束
        gameOver() {
            this.gameStarted = false
            this.isPaused = false
            // 原有逻辑保持不变...
            alert(`可爱捏，有一个笨蛋鸡只拿了：${this.score}分` )
        },

        // 按键处理
        handleKeyDown(e) {
            // if (this.keys.hasOwnProperty(e.key)) {
            //     this.keys[e.key] = true
            //     e.preventDefault()
            // }
            if (e.code === 'Space') { // 空格键处理
                this.togglePause()
                e.preventDefault()
            }
            else if (this.keys.hasOwnProperty(e.key) && !this.isPaused) { // 暂停时禁用其他操作
                this.keys[e.key] = true
                e.preventDefault()
            }
        },

        handleKeyUp(e) {
            if (this.keys.hasOwnProperty(e.key) && !this.isPaused) { // 暂停时禁用其他操作
                this.keys[e.key] = false
            }
        }
    }
}