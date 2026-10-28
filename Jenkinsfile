pipeline {
    agent { label 'windows' }

    tools {
        nodejs 'node-24'
    }

    parameters {
        string(name: 'VPS_HOST', defaultValue: '10.125.5.179', description: 'VPS DNS name or IPv4 address.')
        string(name: 'VPS_HOSTKEY', defaultValue: 'ssh-ed25519 255 SHA256:BCJ44ScpaTH6/mMPRO01VxbzUqe/DUTcHxAULxdb7x4', description: 'Verified PuTTY host-key fingerprint for the selected VPS.')
        string(name: 'VPS_SSH_PORT', defaultValue: '22', description: 'VPS SSH port.')
        string(name: 'VPS_APP_PORT', defaultValue: '3002', description: 'VPS port published to container port 3002; use 1024 or above for rootless Podman.')
        string(name: 'VPS_ENV_FILE', defaultValue: '/app/rule/frontend/.env', description: 'Absolute path to the existing runtime env file on the VPS; no spaces.')
        choice(name: 'IMAGE_PLATFORM', choices: ['linux/amd64', 'linux/arm64'], description: 'Must match the VPS CPU architecture.')
    }

    options {
        skipDefaultCheckout()
        disableConcurrentBuilds()
        timeout(time: 40, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        CI = 'true'
        NEXT_TELEMETRY_DISABLED = '1'
    }

    stages {
        stage('Validate deployment settings') {
            steps {
                script {
                    for (requiredFile in ['package.json', 'package-lock.json', 'Dockerfile', '.dockerignore', 'scripts/transfer-putty.cjs', 'scripts/deploy-podman.sh']) {
                        if (!fileExists(requiredFile)) {
                            error("Missing workspace file: ${requiredFile}. Copy it from the project into the Jenkins workspace before building.")
                        }
                    }
                    if (!readFile('.dockerignore').trim()) {
                        error('Workspace .dockerignore is empty. Copy the project .dockerignore before building.')
                    }
                    def version = bat(script: '''@node -p "require('./package.json').version"''', returnStdout: true).trim()
                    if (!(version ==~ /[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}/)) {
                        error('package.json version must be a valid Docker tag (no + or spaces).')
                    }
                    env.APP_VERSION = version
                    if (!params.VPS_HOSTKEY?.trim() || params.VPS_HOSTKEY.contains('*')) {
                        error('Set a verified VPS_HOSTKEY; wildcard trust is not allowed.')
                    }
                    if (!(params.VPS_HOST ==~ /[A-Za-z0-9][A-Za-z0-9.-]*/)) {
                        error('Set VPS_HOST to a DNS name or IPv4 address.')
                    }
                    if (!(params.VPS_ENV_FILE ==~ '/[A-Za-z0-9_./-]+')) {
                        error('Set VPS_ENV_FILE to an absolute VPS path without spaces.')
                    }
                    for (port in [params.VPS_SSH_PORT, params.VPS_APP_PORT]) {
                        if (!(port ==~ /[0-9]{1,5}/) || port.toInteger() < 1 || port.toInteger() > 65535) {
                            error('SSH and application ports must be between 1 and 65535.')
                        }
                    }
                    if (!(params.IMAGE_PLATFORM in ['linux/amd64', 'linux/arm64'])) {
                        error('Select a supported Linux image platform.')
                    }
                }
                bat 'docker version'
                bat 'plink.exe -V'
                bat 'pscp.exe -V'
            }
        }

        stage('Install dependencies') {
            steps {
                bat 'node --version'
                bat 'call npm --version'
                // Keep installation flags aligned with the existing Dockerfile.
                bat 'call npm ci --legacy-peer-deps --no-audit --no-fund'
            }
        }

        stage('Lint') {
            steps {
                bat 'call npm run lint'
            }
        }

        stage('Build') {
            steps {
                bat 'call npm run build'
            }
        }

        stage('Build Docker image') {
            steps {
                bat 'docker build --platform %IMAGE_PLATFORM% --tag localhost/rule-fe:%APP_VERSION% .'
            }
        }

        stage('Save image TAR') {
            steps {
                bat 'if not exist artifacts mkdir artifacts'
                bat 'docker save --output artifacts\\rule-fe-%APP_VERSION%.tar localhost/rule-fe:%APP_VERSION%'
                archiveArtifacts artifacts: "artifacts/rule-fe-${env.APP_VERSION}.tar", fingerprint: true
            }
        }

        stage('Transfer and deploy with Podman') {
            steps {
                withCredentials([
                    usernamePassword(credentialsId: 'remittance-portal_ssh_usn-pw', usernameVariable: 'VPS_USERNAME', passwordVariable: 'VPS_PASSWORD')
                ]) {
                    bat '@node scripts\\transfer-putty.cjs'
                }
            }
        }
    }

    post {
        always {
            script {
                if (env.APP_VERSION) {
                    bat 'if exist artifacts\\rule-fe-%APP_VERSION%.tar del /q artifacts\\rule-fe-%APP_VERSION%.tar'
                }
            }
        }
    }
}
