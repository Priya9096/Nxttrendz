pipeline {
    agent any
    environment {
        DOCKER_ID  = 'priyaanki'
        BACKEND    = "${DOCKER_ID}/nxttrendz-backend"
        FRONTEND   = "${DOCKER_ID}/nxttrendz-frontend"
        EC2_HOST   = '35.154.230.22'
    }
    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/Priya9096/Nxttrendz'
            }
        }
        stage('Build') {
            steps {
                sh 'docker build -t $BACKEND:$BUILD_NUMBER ./backend'
                sh 'docker build -t $FRONTEND:$BUILD_NUMBER ./frontend'
            }
        }
        stage('Push') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
                    sh 'docker push $BACKEND:$BUILD_NUMBER'
                    sh 'docker push $FRONTEND:$BUILD_NUMBER'
                }
            }
        }
        stage('Deploy') {
            steps {
                sshagent(['ec2-ssh-key']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no ubuntu@$EC2_HOST "
                            cd ~ &&
                            sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=$BUILD_NUMBER/' .env &&
                            docker compose pull &&
                            docker compose up -d
                        "
                    '''
                }
            }
        }
    }
}